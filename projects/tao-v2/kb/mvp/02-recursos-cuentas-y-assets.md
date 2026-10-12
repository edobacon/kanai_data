---
id: DOC-kb-mvp-02-recursos-cuentas-y-assets
project: tao-v2
type: doc
tags:
  - mvp
  - recursos
  - cuentas
  - assets
---

# MVP tao-v2: recursos, cuentas ficticias y assets

Catálogo de recursos que las fichas de ticket citan por id, el dataset de cuentas y unidades ficticias, y el estado de los assets. Ninguna ficha necesita cuenta externa: los roles son cuentas del sistema local, no cuentas de Apple, Google ni proveedores.

## Catálogo de recursos

| Id | Recurso | Estado observado | Responsable | Dónde |
| --- | --- | --- | --- | --- |
| R01 | Base y herramientas: Node 24 por `.nvmrc`, pnpm, Flutter con fvm, Docker, `.venv` python3.13 para mkdocs, Git LFS | El Node por defecto de la máquina es 22: anteponer Node 24 al PATH. Flutter vive en `~/fvm` y no está en el PATH. Todo clon necesita `git lfs install --local` y `git lfs pull` | Dev | `docs/development/setup.md`, `app/.fvmrc`, `scripts/dev/` |
| R02 | Contrato y servidor local: OpenAPI, Express, Prisma 7, PostgreSQL 18 en Docker, pg-boss | Compose con nombres y volumen fijos: aislar base, puertos y cola por corrida en B0-02 | Backend | `server/contract/openapi.yaml`, `server/src/`, `server/prisma/`, `compose.yaml`, `server/.env.example` |
| R03 | Correo de prueba: Mailpit, adaptador SMTP, cola y plantillas | Existe; sin Mailjet ni dominio; hoy hay 3 plantillas | Backend | `server/src/email/`, `server/src/worker.ts`, `docs/development/local-services.md` |
| R04 | Legal y conservación: términos y privacidad v1.0 provisionales con hash | Aprobación definitiva pendiente; se usa el fixture y se registra su estado | Producto y Contenido; Dev integra | `docs/legal/`, `app/assets/legal/` |
| R05 | Diseño y fichas de vista: guía maestra, componentes, widgetbook y diseño web | Existe; no acredita pantallas integradas. `docs/product/diseno-web/` (17 guías) está sin commit hasta X02 | Diseño y Frontend | `docs/product/43_guia_maestra_de_diseno.md`, `docs/product/vistas/`, `docs/product/diseno-web/`, `app/lib/design_system`, `app/widgetbook/` |
| R06 | Assets visuales: inventario de 170 assets y 1167 derivados | 165 son descargables y 5 empaquetados; el proveedor de URL lanza `UnimplementedError`. Todos provisionales. Los objetos LFS están publicados desde el 2026-10-12 y el manifiesto verifica | Diseño y Frontend | `app/assets/manifest.json`, `docs/content/imagenes/assets-index.json`, `app/pubspec.yaml` |
| R07 | Contenido y método: catálogos, esquemas, fuentes | Catálogos empaquetados (9 JSON). Inconsistencias abiertas en `docs/content/99_inconsistencias_por_resolver.md` | Contenido; Dev integra | `docs/content/`, `docs/sources/`, `app/assets/catalogos/` |
| R08 | App y emuladores: Android Emulator e iOS Simulator con SDK e imágenes instaladas | No verificado en esta máquina | Frontend y QA | `app/android/`, `app/ios/`, `app/integration_test/` |
| R09 | Roles, cuentas y unidades ficticias (dataset de esta página) | A completar en B0-02, B1-04 y B5-02 | Producto, Backend, QA | `docs/product/21_productor_productos_y_codigos_de_uso.md`, `docs/product/tecnologia/03_modelo_de_permisos.md` |
| R10 | Web servida por el servidor: Pug, helmet, cookies, Playwright en Chromium y Firefox, HTTPS local si la cookie Secure lo exige | Playwright no está instalado; el repo solo tiene puppeteer (Chromium) por mermaid; la descarga de navegadores es un dato externo de preparación | Frontend y QA | Se crea en W01a |
| R11 | Recordatorios locales: permisos de notificación y alarmas en emulador | `flutter_local_notifications` y `workmanager` declarados en `pubspec.yaml`; solo hay un spike (`app/lib/core/background/spike_background_tasks.dart`) | Frontend y QA | Android 13 o superior (POST_NOTIFICATIONS, alarmas exactas) e iOS Simulator (permiso, límite de 64 notificaciones) |
| R12 | Helper de imágenes de Codex (Kanai) | Activado; modelo `gpt-5.5` registrado hasta 2026-11-11 (declarado por el agente, sin confirmación por formulario); salida en `app/assets/generados`; se usa solo para lo que no existe | Dev | Config de Kanai del proyecto `tao-v2`, `kanai-app/docs/assets-codex.md` |

R10, R11 y R12 son nuevos respecto de V3 (R10 existía con otro contenido: hoy es la web servida por el servidor).

## Cuentas ficticias locales (R09)

Todas viven solo en la base local de la corrida. Las contraseñas y los códigos son de prueba y se generan en el seed; no se escriben en documentos ni reportes.

| Cuenta | Perfil | Estado | Uso |
| --- | --- | --- | --- |
| USR-A | Estándar | Completa, activa, correo verificado | Flujos de app, aislamiento entre cuentas |
| USR-B | Estándar | Completa, activa | Contraparte de USR-A (no ve sus datos) |
| USR-I | Estándar | Solo identidad de instalación, sin correo | Conversión de identidad a cuenta completa |
| USR-SUS | Estándar | Suspendida | Pruebas de denegación y reactivación |
| USR-LEGAL | Estándar | Con versión legal pendiente | Pantalla de aceptación en app y web |
| USR-DEL | Estándar | Completa, activa, con sesiones y aceptaciones; descartable | Eliminación de cuenta por el portal web (W04) y por la app |
| ADM-1 | Administrador | Completa, activa; creada por la CLI de cuentas con perfil (B1-04) | Web de administración |
| PRD-A | Productor | Completa, activa, con Kuberani y Corrector asignados | Web de productor, unidades propias |
| PRD-B | Productor | Completa, activa, solo Corrector asignado | Aislamiento entre productores |
| PRD-SIN | Productor | Sin productos asignados | Estados vacíos, generación denegada |

## Unidades de producto ficticias

Los códigos solo existen como valores de prueba generados en el servidor local. Las unidades sembradas tienen como emisor el productor técnico "Sistema (siembra)".

| Unidad | Tipo | Estado | Uso |
| --- | --- | --- | --- |
| K-DISP | Kuberani | Disponible | Inicio de consulta |
| K-CAND | Kuberani | Candidato (no confirmado) | No consumible |
| K-USADA | Kuberani | Consumida | Rechazo de reuso |
| K-RENOV | Kuberani | Disponible | Renovación (T06) |
| C-DISP | Corrector | Disponible | Reparación (T08) |
| C-USADA | Corrector | Consumida | Rechazo de reuso |
| U-AJENA | Cualquiera | Disponible de otro productor | Acceso denegado por URL o filtro |

IDs de perfiles y productos (D-06): determinados por los seeds de B1-04 (perfiles) y B5-02 (productos), documentados en el contrato y reutilizados por app y web. El valor exacto lo fija el ticket que los siembra.

## Assets (R06)

- Vistas que necesitan empaquetado antes de cerrar: V-04, V-05, V-10, V-11, V-32. Las cubre el ticket A06.
- Vistas que solo usan componentes del design system y tipografía: V-23 a V-27, V-39, V-44, V-45, V-01, V-02, V-03, V-06 a V-09, V-12 a V-14, V-28, V-29.
- Splash (V-31): logo de identidad, ya empaquetado.
- Web: la presentación pública (W00) usa el logo y la ilustración editorial de `diseno-web/assets/`; el portal de eliminación (W04) y el backoffice no llevan imágenes propias; tokens CSS generados desde `docs/product/design-system/tokens.v1.json`.
- Recordatorios: ícono pequeño monocromo de Android para la notificación, no presente en el inventario (a confirmar en T06c; derivar del logo).
- Toda imagen opcional puede omitirse si la interfaz sigue clara. No se genera arte nuevo por defecto; si hace falta, se usa el helper de imágenes (R12) con las imágenes existentes como referencia.

## Datos externos que ninguna ficha puede inventar

- Textos legales definitivos (R04): se usa el fixture provisional.
- Contenido del método (R07): lo ambiguo se pregunta al responsable y se registra en el ticket.
- Copy del recordatorio (T06c): requiere texto aprobado por Producto y Contenido, en español neutro y sin datos de la persona.
- Hora por defecto del recordatorio: propuesta por Producto, ver T06c.
- Texto definitivo de la presentación pública y contacto oficial (W00), y texto de alcance y conservación del portal de eliminación (W04): provisionales en el MVP, se piden antes de publicar.
- Reglas de conservación de datos al eliminar cuenta (Producto). La política de unidades emitidas ante revocación o eliminación de un Productor ya está fijada (DEC-061 y B3-04).

## Qué bloquea realmente un ticket

- Dependencia funcional sin integrar: no se cierra una UI con un mock que siempre responde éxito.
- Asset requerido sin archivo local: se resuelve el bundle antes de cerrar la vista.
- Regla de negocio ambigua: se identifica la pregunta y el responsable; no se completa por inferencia.
- SDK, emulador o servicio local faltante: se prepara la herramienta; la corrida queda pendiente, nunca aprobada por pruebas de widget.
- Aprobación visual o editorial pendiente: permite desarrollo con material provisional, conservando su estado.
