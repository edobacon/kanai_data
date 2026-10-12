---
id: DOC-kb-mvp-00-alcance-y-decisiones
project: tao-v2
type: doc
tags:
  - mvp
  - alcance
  - decisiones
  - hitos
---

# MVP tao-v2: alcance, hitos y decisiones asumidas

Documento de entrada del MVP de tao-v2. Parte del plan V3 de taomangalam (`docs/product/v3/`, copia sin commit en el repo legacy), corregido tras el análisis de coherencia de backend y frontend y tras revisar las muestras de diseño. Los 64 tickets de este KB se crearon en Kanai el 2026-10-12 (TV2-001 a TV2-064, en el orden de las épicas, con las 117 dependencias `depends_on` registradas); este material es su respaldo.

## Estado del documento

- Fecha: 2026-10-12.
- Base: código heredado de taomangalam (main 1e828ca, duplicado en tao-v2).
- Validación del MVP: solo local (API, base, correo Mailpit, emulador, navegador). Sin despliegue, staging, stores ni cuentas externas.
- Tickets: 64 (el plan V3 tenía 41). El aumento viene de partir tickets grandes en motor y UI y de agregar los que faltaban (X02, T04d y T05d se sumaron con la revisión de diseño); luego se fundieron cinco pequeños (B1-05 en B1-04, B4-02 en B4-01, B5-01 en B5-02, W01c en W01b, P03 en P02) y se sumó W04 (portal público de eliminación de cuenta).
- Agrupación: 19 épicas de 2 a 5 tickets con su orden de ejecución y puntos de sincronización en `05-epicas-y-orden-de-ejecucion`.
- Revisión: todas las fichas están revisadas contra el análisis de backend y de frontend, y las de app, tablero y web también contra el material de diseño (`03-referencia-de-diseno-y-muestras`, `04-revision-de-coherencia-diseno`).
- Imágenes: los objetos Git LFS de `app/assets/` se publicaron en `origin` el 2026-10-12; cada clon necesita `git lfs install --local` y `git lfs pull`.
- Helper de imágenes de Codex activado en el proyecto (salida `app/assets/generados`); modelo `gpt-5.5` registrado hasta 2026-11-11 (declarado por el agente, sin formulario de confirmación).
- Estimación: no hay. Ningún ticket tiene tamaño todavía; hay que dimensionar al crearlos.

## Alcance del MVP

Dentro:

- App móvil (Flutter): entrada y cuenta (V-31, V-51, V-27, V-23, V-24, V-25, V-26), tablero y método completo (V-01 a V-14, V-28, V-29, V-32, V-39, V-44, V-45), recordatorios locales de la práctica.
- Web servida por el servidor Express con motor de plantillas Pug y JavaScript de navegador, con tres partes (D-10 y D-12):
  - Presentación pública del producto en `/` (W00).
  - Portal público de eliminación de cuenta en `/eliminar-cuenta` (W04), cuya URL es la que la app obtiene de la configuración (`accountDeletionPortalUrl`).
  - Backoffice en `/backoffice`, con login para Administrador y Productor: gestión de cuentas (V-17, V-18, V-19) y operación de productor (V-36, V-37, V-49).
- Backend: 47 operaciones activas (las 46 del plan V3 más `iniciarSesionWeb`), módulos B0 a B7.
- Línea visual: app con el contrato de fondos de V3 (X02 lo incorpora al repo); web con `docs/product/diseno-web/`, que prevalece sobre V3 para la web (backoffice neutro sin paisajes, público con ilustración).

Fuera (se agregan después, ver `21-extensiones-v1`): biblioteca, glosario, galería de arcanos, solicitud de productos, soporte y chats, auditoría global, estadísticas, gestión de perfiles y permisos, notas multimedia, replay avanzado, sincronización, cartera profesional de consultantes, descarga de la app desde las tiendas, purga programada de cuentas de dispositivo inactivas, login web de usuarios y resumen personal (posteriores a 1.0).

## Hitos

| Hito | Contenido | Resultado verificable |
| --- | --- | --- |
| H0 | Decisiones formales (DEC) y material de diseño en el repo (X01, X02) | DEC publicada en `docs/decisiones/`; plan V3, muestras y `diseno-web` dentro de tao-v2 |
| H1 | Cuenta en servidor: B0, B1, B2, B3 (núcleo) y B5-02 | Registro, acceso, recuperación, legal, eliminación (núcleo) y consumo de unidades funcionando contra API real local |
| H2 | Web y administración: B4-01, W01a, W04, W00, W01b, W02 | Presentación pública en `/`, portal de eliminación completo, y un administrador entra al backoffice, lista y suspende cuentas |
| H3 | Producto y productor: B7-01, B6, W03, P01, P02, B3-04 | Un productor genera y confirma unidades; el servidor las valida; la eliminación cubre producto |
| H4 | App: base (A00 a A06) y tablero (T01 a T11) | Flujo completo de consulta en emulador |
| H5 | Cierre: Q01, Q02 | Recorrido admin, productor, consumo, eliminación y cierre, con informe local |

H2 y H3 son una cadena de servidor y web. B5-02 corre en paralelo con B3 y B4-01. H4 corre en paralelo con H2 y H3 y solo necesita H1 para lo que toca servidor.

## Decisiones asumidas

Estas decisiones se tomaron en la conversación de análisis y se asumen como vigentes. Requieren la DEC formal del ticket X01.

| ID | Decisión | Motivo | Alternativas descartadas |
| --- | --- | --- | --- |
| D-01 | La web se sirve desde Express con Pug y JavaScript, módulo `server/src/web/` | Un solo toolchain, sin CORS, alineado con DEC-153 y DEC-229, precedente de la página legal | Flutter web dentro de `app/` (imports nativos, tablas incómodas); SPA TypeScript separada (segundo toolchain, CORS) |
| D-02 | Sesión web por cookie HttpOnly, Secure, SameSite=Strict, con token CSRF; refresh en cookie con ruta limitada | El token no queda al alcance de scripts | Memoria más sessionStorage |
| D-03 | La web exige aceptar la versión legal pendiente con pantalla propia | No se salta una obligación legal | Eximir esas operaciones |
| D-04 | IDs ULID generados en el servicio; pruebas con Vitest y Supertest, sin Postman | Contrato exige patrón ULID; Postman agrega otro runner (y no existe en el repo) | `cuid()` de Prisma |
| D-05 | `cambiarCorreo` solo con el flujo pendiente; la app lo ofrece únicamente con el correo pendiente de validar; HU-03b-05 queda como extensión | Acota el MVP y sigue a V-24 y V-27 | Incluir HU-03b-05 |
| D-06 | IDs deterministas por seed para perfiles (Estándar, Productor, Administrador) y productos (Kuberani, Corrector) | El app y la web necesitan conocer los ids sin catálogo | Sumar `listarPerfiles` y `listarCatalogo` |
| D-07 | Recordatorios locales de la práctica entran al MVP | Pedido explícito del dev | Dejarlos como extensión |
| D-08 | La preferencia de recordatorios vive en V-27 (Cuenta); por defecto diario a hora fija elegible, desactivado hasta aceptar el permiso | No hay vista de Ajustes en las 33 del MVP | Sección dentro de V-08 |
| D-09 | Acceso web solo para Administrador y Productor; no existe unión a cuenta de dispositivo en la web | Pedido explícito del dev | Login web para todas las cuentas |
| D-10 | La raíz `/` es una presentación pública del producto general; el backoffice vive bajo `/backoffice` con el login para Administrador y Productor; las cookies llevan `Path=/backoffice`, el backoffice no se indexa | Pedido explícito del dev; la parte pública no recibe ni emite cookies | Login en la raíz; backoffice en un subdominio (fuera de alcance local) |
| D-11 | Para la web manda `docs/product/diseno-web/` sobre las muestras V3: backoffice neutro (gris cálido, tarjetas opacas, sin paisajes) y presentación pública con ilustración editorial; la app conserva los fondos V3 | Pedido explícito del dev de un panel más neutro | Paisajes de Productos y Administración del contrato V3 |
| D-12 | El portal de eliminación de cuenta (páginas de solicitud, verificación, confirmación y comprobante) es una vista del servidor bajo `/eliminar-cuenta`, pública y sin cookies (CSRF sin estado); la URL de configuración `accountDeletionPortalUrl` se deriva de esa ruta y de la URL pública del servidor, no es un valor externo | Pedido explícito del dev del 2026-10-12; DEC-129 exige que la app lea la URL de la configuración | Dejar el portal como extensión con una página provisional externa |

Conflictos con decisiones anteriores que la DEC de X01 debe resolver: DEC-105 y DEC-051 (backoffice en smartphone y tablet con paridad), DEC-229 y DEC-153 (login web después de 1.0; el portal mínimo de DEC-229 se construye ahora), DEC-163 (CORS para web, deja de aplicar), DEC-162 (cabeceras, sí aplica), DEC-129 (URL del portal, precisada por D-12) y DEC-224 (purga de 12 meses, aplazada). La DEC además agrega la presentación pública y el portal como páginas fuera del catálogo de vistas y registra D-11 como excepción a la línea visual V3 de la web.

## Decisiones cerradas el 2026-10-12 (sin DEC nueva)

Se apoyan en decisiones existentes y se recogen en las fichas:

| Tema | Decisión | Base | Ficha |
| --- | --- | --- | --- |
| Ventana del token de 15 minutos | El estado de la cuenta se verifica en cada petición: una suspensión surte efecto de inmediato | DEC-161, DEC-232 | B1-04 |
| Unidades al revocar a un Productor | Se conservan y siguen siendo válidas; revocar solo impide generar a futuro | DEC-061 | B7-01, W03 |
| Productor eliminado | Sus unidades pasan al productor técnico "Sistema (siembra)", sus asignaciones se revocan | DEC-127, DEC-232 | B3-04 |
| Cómo nace un Productor | Se registra como Estándar en la app y un Administrador le asigna el perfil (W03); la CLI de B1-04 lo hace en local | DEC-111, DEC-154 | B1-04, W03 |
| "Cambiar correo" en V-27 | Solo con el correo pendiente de validar; no se muestra con el correo ya validado | V-24, V-27, D-05 | A04, A03a |
| Purga de 12 meses | Fuera del MVP; solo se declara la clave de configuración | DEC-224 | B3-02 |
| T05d | Dentro del MVP como último ticket de su épica, sin bloquear Q01 | DEC-184, DEC-168 | T05d |
| Contenido de W00 | Copy provisional sin contacto ni tiendas; el definitivo se pide antes de publicar | `diseno-web` 00 y 01 | W00 |
| Dependencias de B5-02 y B4-01 | Relajadas: B5-02 sin B3-03 y B4-01 sin B3-03 | Planificación | B5-02, B4-01, `05` |
| Portal de eliminación | Ticket W04, vista del servidor (D-12) | Pedido del dev | W04 |

## Preguntas abiertas que cruzan varios tickets

- Contenido de la presentación pública: texto definitivo, datos de contacto oficiales y enlaces a tiendas (W00). No bloquea el desarrollo; sí la publicación.
- Texto de alcance y conservación del portal de eliminación aprobado por Producto (W04).
- Si el host de producción tiene que figurar en los hosts permitidos de DEC-129 y cómo valida el contrato una URL `http` en local (B1-01).
- Diseño (ver divergencias en `03`):
  - Recordatorios (T06c) no tienen muestra; se diseñan con los tokens existentes.
  - Contenido por resolver sobre los pasos previos propios de ciertos anillos (DEC-234): bloquea la aprobación de T07 y T08, no su construcción.
  - Que el productor técnico "Sistema (siembra)" exista en el seed de este repo (B3-04 y B5-02).

## Hallazgos del análisis que este plan corrige

Backend: ver `10-tickets-h1-backend-cuenta`. Frontend: login web imposible con el contrato actual, plan web sin DEC, motor local sin capa de aplicación, sin aislamiento por cuenta, FE-T07 a T11 sobredimensionados y traslapados, IDs de producto y perfil sin resolver, FE-A02 subestimado, sin matriz vista a ticket, assets sin empaquetar, onboarding de admin y productor sin ticket, infraestructura HTTP web inexistente, cadena de dependencias lineal, FE-W03 casi vacío. Sin presentación pública del producto en el plan V3 y sin portal de eliminación sirviendo la URL que la app necesita. Diseño: el plan V3 y las muestras no están en el repo de tao-v2, varias muestras dibujan funciones fuera del MVP, siete vistas de la app no tienen muestra, las imágenes del repo eran punteros LFS sin contenido (resuelto), y los tokens de la web no estaban en el design system. Entorno: el `compose.yaml` choca con el stack del repo legacy (B0-02).

## Índice de este KB

- `01-ficha-de-ticket`: qué información necesita Kanai por ticket.
- `02-recursos-cuentas-y-assets`: recursos R01 a R12, cuentas ficticias, unidades y assets.
- `03-referencia-de-diseno-y-muestras`: orden de referencia, contrato de fondos, línea visual web, matrices vista a ticket, divergencias y aceptación visual.
- `04-revision-de-coherencia-diseno`: revisión de coherencia, estado de hallazgos y helper de imágenes.
- `05-epicas-y-orden-de-ejecucion`: 19 épicas, verificación de dependencias entre épicas, carriles, puntos de sincronización y optimización.
- `10-tickets-h1-backend-cuenta`: X01 y B0 a B3, incluye B3-04 (14 tickets).
- `11-tickets-h2-h3-web-y-producto`: B4-01, W00, W04, W01a, W01b, W02, B5-02, B7-01, B6-01, B6-02, W03, P01, P02 (13 tickets).
- `12-tickets-h4-app-base`: X02, A00, A02, A05, A03a, A03b, A04, A06 (8 tickets).
- `13-tickets-h4-tablero-t01-t06`: T01a a T06c (17 tickets, incluye T04d, T05d y recordatorios T06b y T06c).
- `14-tickets-h4-h5-tablero-t07-t11-y-cierre`: T07a a T11b, Q01 y Q02 (12 tickets).
- `20-mapa-de-dependencias`: grafo, ids absorbidos, camino crítico y equivalencia de ids V3.
- `21-extensiones-v1`: puntos de extensión para sumar funcionalidad de v1.
