---
id: DOC-kb-mvp-03-referencia-de-diseno-y-muestras
project: tao-v2
type: doc
tags:
  - mvp
  - diseno
  - muestras
  - fondos
  - assets
---

# MVP tao-v2: referencia de diseño, muestras visuales y divergencias

Resume el material de diseño que el dev preparó el 2026-10-11 y cómo lo usan los tickets de la app y del backoffice. Hay dos fuentes con autoridades distintas:

- **App**: plan V3 y muestras en el repo legacy (`taomangalam/docs/product/v3/`, sin commit). Las fichas de `12`, `13` y `14` citan este documento en su campo Diseño.
- **Web servida por backend**: `docs/product/diseno-web/` en `tao-v2` (sin commit; 17 guías, 7 variantes, 24 imágenes y 22 maquetas HTML). Desde 2026-10-12 declara su "Autoridad de diseño web": ante una diferencia con V3 prevalece ese directorio. Las fichas de `11` lo citan en su campo Diseño.

Todo es propuesta visual para revisar composición y jerarquía: no son capturas del producto ni diseños aprobados, y nada se ha ejecutado en emulador ni contra backend. La revisión de coherencia está en `04-revision-de-coherencia-diseno`.

## Dónde está y qué contiene

Ruta de origen de la app: `taomangalam/docs/product/v3/` (34 MB, sin commit; es la única copia). Contenido relevante para el diseño:

- Guías: `09_casas_e_interacciones.md` (comportamiento de Casas, dados, práctica, retroceso, cierre), `10_entrada_splash_y_cuenta.md`, `11_assets_perfil_personalidad_y_dados.md`, `12_dados_y_animaciones.md`, `13_linea_visual_y_fondos.md`.
- `muestras/`: 25 imágenes (42 estados y composiciones), `manifest.json` (vista a imagen a ticket), `contrato-visual.json` (fondos por familia), `prompts*.json`, dos maquetas HTML navegables (`20-recorrido-assets-reales.html`, `24-demo-dados-animaciones.html`), un video WebM, `fondos-muestras.css` y `activos-reales/` (copias byte a byte de assets del app, fuentes con licencias y verificaciones del prototipo).
- Las imágenes 01 a 14 son referencias de intención hechas con ImageGen (sus paisajes y proporciones no son archivos exactos). Las 15 a 19 y 21 a 23 son capturas de HTML con los assets reales sin modificar. Las muestras 03 y 04 (web) quedan solo como referencia de composición: las sustituye `diseno-web`.

Ruta de la web: `tao-v2/docs/product/diseno-web/` con `00-criterio-web.md` (autoridad, identidad, rutas, seguridad), `README.md` (índice), `manifest.json` (17 páginas, operaciones y 74 artefactos con sha256, verificados), una guía `.md`, `.png` y `.html` por vista, `web-guia.css`, `visor.js` y `assets/` (logo, ilustraciones y fuentes reutilizados byte a byte).

El ticket X02 trae el material de la app a `tao-v2` y consolida el de la web (commit, índice y contrato) para que las fichas citen rutas del repo.

## Orden de referencia (guía 13)

1. Alcance vigente (tickets de este KB) y fuente funcional o catálogo de la vista.
2. Guía maestra de diseño, el contrato de composición y las reglas de animación. Para la web, `diseno-web/00-criterio-web.md` y la ficha de la vista.
3. Maqueta HTML y capturas actualizadas.
4. Imágenes de ImageGen (intención editorial, no especificación literal).

Si dos documentos discrepan, se registra la discrepancia y se resuelve antes de cambiar la regla. Una imagen generada no sustituye un asset ni autoriza cambiar el contenido de una Casa, el animal, el logo o las reglas del tablero. Las maquetas son guía visual: las funciones exactas las fijan los tickets, y si la maqueta muestra algo que el ticket no pide, se construye lo del ticket.

## Contrato visual de fondos (app)

- Tres capas: fondo ambiental (paisaje de la familia, pantalla completa, detrás de todo, nunca dentro de una tarjeta), superficies funcionales (marfil opaco `#FFFDF8`, borde `#D8CBB4`, para lecturas, formularios y controles) e ilustración protagonista (archivo específico de la Casa, animal o paso del ritual).
- Base `#FAF7F0`. Arte del fondo con opacidad `0.18`, recorte `cover`, posición `50% 50%`, una sola vez (sin segundo lavado, sin aplicar opacidad al contenedor del texto). Con contraste aumentado la opacidad decorativa es `0`. El paisaje no se anima ni se desplaza. Si el asset falla queda la base marfil y la vista sigue usable. Al menos 65 % de zona visual tranquila.
- Ya existe `TaoBackgroundLayer` (`app/lib/core/images/background_layer.dart`, DEC-235): es la única forma sancionada de dibujar fondos. No se crea un sistema paralelo. Hay composiciones derivadas muy atenuadas en `app/assets/fondos-vistas/composiciones/` (variantes por viewport): al integrar se revisa qué variante elige el resolvedor, porque puede hacer desaparecer el paisaje (se compara la captura contra la muestra; si se ve más tenue se cambia la variante, no la opacidad).
- Un modal, un paso del ritual o un paso de reparación conserva el fondo de su anfitrión. V-39 dentro de reparación hereda Retroceso, no el paisaje de productos.

| Familia | Vistas | Archivo (`app/assets/fondos-vistas/`) |
| --- | --- | --- |
| Entrada | V-31, bienvenida y acceso previo a cuenta | `familia-identidad-entrada.webp` |
| Inicio | V-01 | `v-01-inicio.webp` |
| Perfil y consultas | V-02, V-03, V-28, V-29, V-44, personalidad | `familia-consultas-personas.webp` |
| Recorrido | V-04 a V-08, V-13, V-14, V-32, ritual y dados | `familia-recorrido.webp` |
| Retroceso | V-09 a V-12, reparación y sus pasos | `v-09-retroceso.webp` |
| Biblioteca | V-45 (y otras diferidas) | `familia-biblioteca-aprendizaje.webp` |
| Cuenta | V-23 a V-27 | `v-27-cuenta.webp` |

Las familias Productos web (`v-34-productos.webp`) y Administración web (`familia-administracion.webp`) del contrato V3 NO se usan en el MVP: la web las sustituye por el backoffice neutro (ver siguiente sección).

Hoy el manifiesto de assets marca esos fondos como descargables (40 de 42 con modo descargable): el empaquetado o la caché de los que se necesitan sin conexión está en el ticket A06. Las imágenes del repo son objetos Git LFS: se publicaron en `origin` el 2026-10-12 y cada clon necesita `git lfs install --local` y `git lfs pull`.

## Línea visual de la web (`diseno-web`)

| Elemento | Presentación pública (`/`) y portal (`/eliminar-cuenta`) | Backoffice (`/backoffice`) |
| --- | --- | --- |
| Fondo | Marfil `#FAF7F0`, secciones amplias, cierre azul noche (el portal usa la versión sobria de la guía 17) | Gris cálido `#F4F4F2` con tarjetas marfil opacas |
| Ilustración | Protagonista grande sin texto encima, sin estirar (solo en la presentación) | Sin paisajes ni imágenes de producto obligatorias |
| Tipografía | Zen Old Mincho en titulares, Spectral en relato | Sistema del navegador, Zen solo en la marca |
| Acentos | Oro en numeración y marco, rojo en frase inicial | Oro en navegación activa; estados con texto y color |
| Navegación | Anclas y acceso discreto al equipo en el pie | Encabezado, rol y menú lateral por capacidades |

Comparten logo, marfil `#FAF7F0`, tinta `#141A37`, primario `#071A33`, oro `#B5863A`, verde `#3F6B4A` y rojo `#7F0E06`. Acciones de al menos 48 px, foco visible, texto operativo de 15 px, tablas con desplazamiento horizontal dentro de su contenedor en móvil. No se usa `TaoBackgroundLayer` ni el CSS de fondos de la app en la web.

### Matriz web: guía, ruta y ficha

| Guía | Ruta propuesta | Ficha MVP |
| --- | --- | --- |
| 01 portada (y variante móvil) | `/` | W00 |
| 16 legal público (y términos) | `/legal/:tipo/:version` | W00 |
| 02 acceso | `/backoffice/login` | W01b |
| 03 aceptación legal | `/backoffice/legal` | W01b |
| 15 estados (401, 403, 404, 500, vacío) | públicas y `/backoffice/*` | W01a, W01b |
| 04 inicio administrativo (V-17) | `/backoffice/admin` | W01b, W02 |
| 05 listado de cuentas (V-18) | `/backoffice/admin/cuentas` | W02 |
| 06 detalle de cuenta (V-19) | `/backoffice/admin/cuentas/:cuentaId` | W02 |
| 07 edición de cuenta | `/backoffice/admin/cuentas/:cuentaId/editar` | W02 |
| 08 suspensión y reactivación | `/backoffice/admin/cuentas/:cuentaId/suspender` | W02 |
| 09 perfil Productor y asignaciones | `/backoffice/admin/productores` | W03 |
| 10 productos autorizados (V-36) | `/backoffice/productor` | P01 |
| 11 unidades propias (y variante móvil) | `/backoffice/productor/unidades` | P01 |
| 12 registrar unidad: producto (V-37) | `/backoffice/productor/unidades/nueva` | P02 |
| 13 candidata: confirmar o descartar | `/backoffice/productor/unidades/:unidadId/confirmar` | P02 |
| 14 detalle y revelación (V-49) | `/backoffice/productor/unidades/:unidadId` | P02 |
| 17 portal de eliminación (4 pantallas: solicitud, verificación, confirmación, comprobante) | `/eliminar-cuenta`, `/eliminar-cuenta/:solicitudId/verificacion`, `/eliminar-cuenta/:solicitudId/confirmacion`, `/eliminar-cuenta/comprobante/:comprobante` | W04 |

Las rutas de edición, confirmación y legal son rutas HTML de Pug, no endpoints REST nuevos; los formularios que mutan son POST con CSRF y nunca GET (el visor de las maquetas usa enlaces estáticos solo para recorrerlas). El portal de eliminación usa un CSRF sin estado porque no emite cookies.

## Matriz vista, ticket MVP y muestra (app)

| Vista | Ticket MVP | Muestra (imagen, parte) | Familia de fondo |
| --- | --- | --- | --- |
| V-31 Splash | A02 | 11 izquierda | Entrada |
| V-51 Aceptación legal | A02 | 12 izquierda | Entrada (propuesto, la guía no la asigna) |
| V-25 Iniciar sesión | A03a | 12 derecha | Cuenta |
| V-23 Crear cuenta, V-24 Validar correo | A03a | 13 | Cuenta |
| V-26 Recuperación y nueva contraseña | A03b | 14 | Cuenta |
| V-27 Cuenta | A04, T06c | 02 izquierda | Cuenta |
| V-01 Inicio y Inicio sin consultas | T01a | 01 izquierda, 11 derecha | Inicio |
| V-28 Mi perfil, V-29 resumen, número, signo y bloques | T02b | 15, 16, 17 | Perfil y consultas |
| V-39 Consumo de Kuberani | T03b | 02 derecha | Anfitrión |
| V-32 Tablero | T04b | 01 derecha, 23 | Recorrido |
| V-04 Materiales, preparación y ritual | T04c | 10 izquierda, 18, 21 | Recorrido |
| V-05 Ficha de Casa | T04d | 05 | Recorrido |
| V-06 Dados y revisión | T05a | 06, 19 | Recorrido |
| V-06 Corrección de última tirada | T05c | 10 derecha | Recorrido |
| V-06 Registro animado y recorrido | T05d | 22, 23, demo 24, video 25 | Recorrido |
| V-08 Práctica | T06 | 07 izquierda | Recorrido |
| V-10 Anillo | T07b | 08 izquierda | Retroceso |
| V-11 Reparación | T08b | 08 derecha | Retroceso |
| V-12 Coherencia | T09b | 07 derecha | Retroceso |
| V-13 Historial | T10b | 09 derecha | Recorrido |
| V-14 Cierre en Casa 12 | T11b | 09 izquierda | Recorrido |

Vistas de la app sin muestra: V-02 (crear consulta), V-03 (detalle de consulta), V-07 (resultado de movimiento, solo aparece su estado en la 23), V-09 (diagnóstico de retroceso), V-44 (lista de consultas), V-45 (Acerca de) y la preferencia de recordatorios (V-27 ampliada). Esos tickets se apoyan en la ficha funcional y la guía maestra, y su cierre pide una captura local revisada contra esta guía. Todas las vistas web tienen guía en `diseno-web`, incluido el portal de eliminación (guía 17, ficha W04).

## Divergencias entre el diseño y el plan MVP

| Tema | Diseño o documento | Plan MVP | Resolución |
| --- | --- | --- | --- |
| Fondos de la web | V3 asigna paisajes de Productos y Administración | `diseno-web` declara backoffice neutro (pedido del dev) | RESUELTO: manda `diseno-web` (2026-10-12) |
| Edición web de cuenta | La muestra V3 04 edita Nombre y Correo sin motivo | El contrato solo admite `locale` y `timezoneId`, y toda acción exige `motivo` | RESUELTO: la guía 07 de `diseno-web` ya edita solo esos campos con motivo |
| Recordatorios | V3 los excluye (README, 02, 03, 06, 09, `plan_v3.json`, `tickets_recursos.csv`) | D-07 los incluye (T06b y T06c) | X02 corrige esos textos; T06c necesita un diseño nuevo de la preferencia en V-27 y del estado de permiso |
| Cambiar correo en V-27 | La muestra 02 lo ofrece en una cuenta verificada | D-05, V-24 y V-27: solo corregir un correo pendiente (el servidor responde 409 para cuenta activa) | RESUELTO (2026-10-12): A04 lo muestra solo con el correo pendiente de validar; con el correo validado no aparece |
| Productor revocado | La muestra V3 04 dice "los cambios se aplican a nuevos registros de unidades" | B7-01 tenía abierta la política de unidades emitidas | RESUELTO (DEC-061): la revocación impide generar a futuro y las unidades ya emitidas se conservan |
| Animación de dados y recorrido | La guía 09 dice que la animación avanzada no bloquea la entrega; la 12 la especifica (800 ms, DEC-184 y DEC-185) | Antes estaba dentro de T05 y T06 | RESUELTO (2026-10-12): ticket propio T05d, dentro del MVP como último de su épica y no bloqueante; el flujo base usa movimiento reducido |
| Pasos previos de ciertos anillos | La guía 09 señala una duda pendiente de Contenido (DEC-234, V-10 y V-11) | T07b y T08a | No se aprueban todos los casos hasta resolverla; el ejemplo usa el anillo 1 |
| Icono de instalación | Decisión pendiente según la guía 10 | Fuera de los tickets | Sin ticket; el splash nativo usa recursos locales estáticos |
| Menú en la pantalla legal | El generador dibujó un menú | Debe ocultarse (no puede saltar el consentimiento) | Regla de aceptación de A02 |
| Portal de eliminación de cuenta | `diseno-web` lo diseña (guía 17, 4 pantallas) como propuesta pendiente | B3-02 ya soporta la eliminación y DEC-129 exige una URL en la configuración | RESUELTO (2026-10-12, D-12): ticket W04, vista del servidor bajo `/eliminar-cuenta`; la URL de configuración sale de su ruta |

## Bloques estándar para todo ticket de interfaz

Se incluye en el cuerpo de cada ticket de UI (rutas del repo `tao-v2` tras X02).

App:

> Implementa la vista siguiendo `docs/product/v3/13_linea_visual_y_fondos.md` y el contrato visual de tao-v2 (`contrato-visual.json`). Resuelve primero la familia y el contexto anfitrión. Usa los assets existentes y conserva su procedencia. Separa fondo ambiental, superficie funcional e ilustración protagonista. Reutiliza `TaoBackgroundLayer` y los componentes existentes y respeta las acciones amplias de la muestra. No uses una imagen generada como especificación literal ni inventes assets, contenido o variantes. Texto, mantras, animal y frase salen del catálogo, nunca de la imagen. La maqueta guía lo visual; las funciones las fijan este ticket y su ficha. Entrega una captura local y comprueba fondo, recorte, legibilidad y navegación. La aceptación final ocurre en emulador local.

Web:

> Implementa la vista siguiendo `docs/product/diseno-web/00-criterio-web.md` y la guía de la vista (`docs/product/diseno-web/NN-nombre.md`). Backoffice neutro sin paisajes; presentación pública con ilustración editorial. Usa Pug con salida escapada, los tokens del design system (no colores copiados a mano), formularios POST con CSRF (nunca mutaciones GET), sin scripts ni estilos inline y sin copiar la capa de fondos de la app. La maqueta guía lo visual; las funciones, permisos y operaciones los fijan este ticket y las fichas. No añadas métricas, impersonación, invitaciones, catálogo ni datos del consumidor aunque aparezcan en una referencia antigua. Entrega capturas locales en Chromium y Firefox a 375 y 1280 px contra el servidor local; una maqueta que navega no acredita la implementación.

## Lista de aceptación visual común

App:

1. Familia y archivo corresponden a la vista; modal o paso conserva el contexto.
2. Fondo visible en los espacios libres, sin estiramiento, franja ni doble lavado.
3. Texto largo sobre superficie opaca y legible; acciones de al menos 56 dp con 12 dp de separación; zonas táctiles de 48 por 48 dp.
4. Logo, fuentes (Zen Old Mincho, Spectral, IBM Plex Mono) y contenido provienen de los recursos existentes.
5. Movimiento reducido y contraste aumentado conservan la función; un error de asset no bloquea la vista.
6. Captura comparada con la muestra y verificación local. El HTML es referencia de diseño, no evidencia de una app probada.

Web:

1. Capa y rutas correctas (público y portal sin cookies, backoffice bajo `/backoffice`); superficies neutras y opacas.
2. Colores y tipografías salen de los tokens del design system.
3. Acciones de al menos 48 px, separación de 12 px, foco visible y navegación completa por teclado; contraste AA.
4. Estados de carga, vacío, error y sin permiso con texto accionable (no claves internas).
5. 375 y 1280 px sin desbordamiento de página; tablas con desplazamiento dentro de su contenedor; con contraste aumentado se conserva la función.
6. Chromium y Firefox; la parte pública se ve completa sin JavaScript.
