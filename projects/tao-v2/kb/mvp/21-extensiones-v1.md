---
id: DOC-kb-mvp-21-extensiones-v1
project: tao-v2
type: doc
tags:
  - mvp
  - extensiones
  - v1
---

# MVP tao-v2: puntos de extensión para funcionalidad de v1

El MVP no cierra la puerta a funcionalidad de v1 (taomangalam). Este documento lista lo diferido, dónde se enchufa y qué decisión del MVP lo permite. Es guía de diseño, no alcance: nada de esto se implementa en los 64 tickets.

## Diferido y dónde se enchufa

| Funcionalidad v1 diferida | Punto de extensión en el MVP | Qué debe respetar el MVP hoy |
| --- | --- | --- |
| 74 operaciones de API diferidas (47 activas de 120 con `iniciarSesionWeb`) | El contrato OpenAPI ya las define; el manifiesto filtra capacidades por alcance (B1-01) | No borrar operaciones del contrato; activar es sumar handler y capacidad |
| Catálogo de productos y solicitudes (V-34, V-35, V-47, V-48, V-38, V-40) | IDs deterministas de productos por seed (D-06); módulo de productor de la web | El seed no impide agregar productos nuevos |
| Gestión de perfiles y permisos (V-50), `listarPerfiles` | Perfiles con ids deterministas y asignación por capacidad (B1-04, B7-01) | No codificar perfiles fijos en la lógica: leer de la tabla de perfiles |
| Más perfiles con acceso web | Campo `superficie` de la sesión y guardas por capacidad en `server/src/web/` (W01a, W01b) | `iniciarSesionWeb` filtra por una lista de perfiles configurable, no por una constante |
| Otras secciones web (auditoría V-22, explorador V-20, estadísticas V-21) | Registro de secciones por capacidad en el shell web (W01b) | Las vistas se registran, no se cablean en el layout |
| Login web de usuarios, resumen personal e instrucciones de respaldo en el portal (posteriores a 1.0, DEC-229 y DEC-106) | Capa pública del portal (W04) y sesión web por superficie (B1-04) | El portal de eliminación no depende de una sesión y no se mezcla con el backoffice |
| Soporte y chats (V-42, V-43), espacio y material respaldado (V-41) | Registro de módulos por capacidad de la app (A02, `isBuilt: false`) | No borrar Biblioteca, Productos y Ayuda: quedan sin construir |
| Biblioteca, glosario, galería de arcanos, instructivo (V-15, V-33, V-30, V-46) | Catálogos ya empaquetados en `app/assets/catalogos/`; cargadores en `app/lib/catalogos/` | No retirar los catálogos del paquete |
| Cambio de correo completo (HU-03b-05) | Flujo de cambio de correo pendiente (B3-01) y la acción de corregir el correo pendiente en V-24 y V-27 (A03a, A04) | Mantener el contrato del flujo pendiente estable |
| Sincronización multi-dispositivo y respaldo | Columnas `device_origin_id`, `version`, `deleted_at` y `espacio_datos.estado` (A05) | No eliminar esas columnas; el espacio por cuenta es la base |
| Cartera profesional, notas multimedia, adjuntos, replay avanzado | Motor y proyecciones del historial (T10a) | El historial se modela como eventos inmutables |
| Más tipos de recordatorio y recordatorios por servidor | Servicio de recordatorios con tipos extensibles (T06b) | El servicio no asume un único tipo ni una única regla |
| Más tipos de unidad y más motivos de uso | `validarYUsarUnidad` con motivo como enumeración (B5-02); `PuertoValidacionUnidad` (T03a) | Agregar un motivo no cambia el esquema |
| Eliminación de cuenta con más componentes | Eliminación partida en núcleo y componente de producto (B3-02, B3-04) | Cada componente futuro registra su propia limpieza |
| Purga programada de cuentas de dispositivo inactivas (12 meses, DEC-224) y borrado físico de comprobantes vencidos (90 días, DEC-127) | Clave de configuración del plazo declarada en B3-02 y comprobante con fecha de vencimiento | El primer job programado de pg-boss se agrega sin migrar; debe hacerse antes de publicar |
| Notificaciones push | La preferencia de recordatorios (V-27) y los permisos (T06c) ya existen | El texto y las preferencias no dependen del canal |

## Reglas para no cerrar la puerta

1. El contrato OpenAPI es la fuente: cualquier ampliación entra por el contrato (Spectral, openapi-diff, tipos y cliente generados).
2. Las capacidades (`x-capacidad`) gobiernan qué ve cada perfil en app y web; no se agregan chequeos por rol dentro de las vistas.
3. Los cambios de esquema Drift son aditivos con fixtures congelados (A05, T07a).
4. El esquema del servidor se migra desde cero por el rol migrador con seeds nombrados e idempotentes (B0-03, B1-04).
5. Cada funcionalidad nueva se agrega como ticket con la misma ficha (`01-ficha-de-ticket`), referenciando el ticket v1 cerrado equivalente en `historico-v1/tickets-cerrados-taomangalam`.

## Cómo traer funcionalidad de v1

1. Buscar el ticket v1 en `historico-v1/tickets-cerrados-taomangalam` y su contexto con `projectId=taomangalam`.
2. Revisar si la operación está en el contrato y qué handler falta.
3. Activar la capacidad y la vista, con su ficha y su dependencia contra tickets del MVP.
4. Actualizar este documento y la matriz de vistas.
