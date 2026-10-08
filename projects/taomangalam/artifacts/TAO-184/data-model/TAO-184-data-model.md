# Modelo de datos afectado — TAO-184

La app reutiliza el proveedor público y el FlutterSecureStorage existente. La obligatoriedad incorpora una entrada física adicional de almacenamiento seguro clave/valor; PreferenceStore.read/write conserva exclusivamente AccessibilityPreferences booleanas.

## app_release — servidor existente
Fuente: server/prisma/schema.prisma y server/src/services/app-version.ts.

| Campo físico | Tipo | Uso |
|---|---|---|
| platform | AppPlatform | Plataforma de publicación |
| version | String | Versión semántica recomendada |
| build | Int | Compilación recomendada |
| minimumVersion | String | Versión semántica mínima |
| minimumBuild | Int | Compilación mínima admitida |
| storeUrl | String nullable | Tienda recibida del servidor |
| title | String nullable | Título |
| message | String nullable | Mensaje |
| notes | String nullable | Notas |
| id, status, publishedAt, updatedAt | Campos existentes | Identificación y publicación |

La respuesta HTTP contiene plataforma, estado, versionMinima y versionRecomendada como String semver+build, y urlTienda, titulo, mensaje y notas String nullable. No existe versionDisponible. El error 426 contiene codigo version_minima y versionMinima String semver+build.

## preferencia_local — almacenamiento seguro existente
AppVersionStore añade lectura/escritura de la clave tao.app.actualizacion_obligatoria.v1. La clave histórica tao.app.version y las claves de accesibilidad conservan sus contratos.

Un único objeto JSON por instalación:

| Campo | Tipo |
|---|---|
| schemaVersion | int, literal 1 |
| platform | String |
| minimumVersion | String semver+build |
| minimumBuild | int |
| recommendedVersion, storeUrl, title, message, notes | String nullable |

La lectura valida esquema, tipos, plataforma, gramática semver con prerelease opcional y build decimal, y coherencia entre minimumVersion y minimumBuild. Se compara solo el build entero seguro, nunca el orden semántico. Build inferior consume el registro incluso si cambió la versión instalada; build igual o superior excluye su consumo y conserva el objeto guardado. No hay borrado ni backfill. Registro ausente, inválido o de otra plataforma no acredita obligación.

## Estado en memoria
MandatoryUpdateState contiene snapshot y trigger apertura o 426. La publicación ocurre antes de esperar persistencia o completar contenido. La splash conserva Identidad/entrada durante resolución; el gate global bloquea router, desarrollo y consentimiento legal. Las consultas y presentaciones simultáneas se deduplican; una falla conserva mínima y fallback.

## Observabilidad y preferencias
aviso_actualizacion_obligatoria_mostrado contiene exclusivamente plataforma, compilacion y disparador. actualizacion_obligatoria_error_configuracion añade codigo url_tienda_nula. No registra URL, mensajes, notas ni datos personales. Un reporter inyectable escribe mediante dart:developer.log.

El movimiento reducido sigue la cadena PreferenceStoreReducedMotionStore y la clave accesibilidad.movimiento.v1. Este modelo no incorpora otro store de accesibilidad ni modificaciones del esquema servidor.