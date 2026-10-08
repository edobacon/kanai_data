---
id: TAO-188-SPEC
project: taomangalam
ticket: TAO-188
status: draft
---

# HU-01-14 · Revisión de documentos legales y consentimiento de analítica

## Resumen ejecutivo

Preparar V-51 en modo revisión desde V-27, mostrando aceptaciones legales y permitiendo cambiar analítica según la política vigente.
Reutilizar las operaciones existentes; excluir aceptación obligatoria, implementación regional, backend nuevo y construcción de Cuenta.
Plan de dos sesiones de 1,5–3 horas sobre epic/EP-01a, con ejecución autónoma y Teach omitido; este intake no inicia código.
Antes de ejecutar, comprobar HU-01-13, HU-15-03 y HU-03b-11; la autorización de rama compartida no elimina estas condiciones ni resuelve el guard que consulta origin/main.
Validar lectura sin aceptación, consentimiento confirmado, errores, offline e impersonación mediante pruebas focalizadas y revisión accesible y visual en teléfono/tablet.
Antes de aprobar, obtener preaprobación del juez del spec y copiar las tareas al ticket; conservar pendientes las aprobaciones humanas de Diseño/QA.
Datos a confirmar antes de ejecutar:
- Archivos concretos de V-51, navegación V-27, componentes reutilizables y pruebas focalizadas: inspeccionar epic/EP-01a; los extractos de origin/main no contienen esas implementaciones.
- Firmas y campos de versiones vigentes, política, consentimiento, errorId e idempotencia: confirmar en el contrato OpenAPI y proveedores existentes de epic/EP-01a.
- Límite de página admitido y estrategia existente de caché: confirmar en listarMisAceptaciones y su consumidor; no inventar límites ni un almacenamiento paralelo.
- Comandos exactos para los archivos de pruebas nuevos o ajustados y ubicación de maqueta V-51/doc 43 §9: concretarlos durante aprobación del spec.
- Disponibilidad efectiva de las tres dependencias y resolución autorizada del guard de origin/main: confirmar en Kanai antes de habilitar ejecución.

## Requirements

#### REQ-01 `confirmed`
> Fuente: taomangalam/server/contract/generated/api.d.ts:587; taomangalam/server/contract/generated/api.d.ts:604; taomangalam/server/contract/generated/api.d.ts:4813; request HU-01-14, criterios legales
> Necesidad: build
Qué: presentar en V-51 el historial propio de términos y privacidad con versión y fecha, consultar los textos aceptados y vigentes, y distinguir si corresponde nueva aceptación. Por qué: permitir revisar decisiones sin registrar aceptación al abrir o leer. Consumir listarMisAceptaciones mediante páginas acotadas usando limit, cursor y siguienteCursor, sin descargar todo el historial al abrir.

#### REQ-02 `inferred`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:1702; taomangalam/app/lib/features/legal/data/puerto_analitica.dart; request HU-01-14, criterios de consentimiento
> Necesidad: build
Qué: mostrar el estado de analítica y acciones explícitas admitidas por opt_in, opt_out o disabled, registrando cambios mediante registrarConsentimientoAnalitica. Por qué: dar control conforme a la política sin alterar eventos previos; el nuevo estado se presenta como confirmado únicamente tras respuesta válida del servidor.

#### REQ-03 `inferred`
> Fuente: taomangalam/server/src/privacidad/politica-analitica.ts; taomangalam/app/lib/features/legal/data/puerto_analitica.dart; request HU-01-14, estados y requisitos transversales
> Necesidad: build
Qué: representar carga, error, lectura desde caché identificada, ausencia de política y reintento, conservando el último consentimiento confirmado hasta confirmar una escritura con red. Por qué: evitar éxito prematuro y decisiones inseguras; reutilizar la idempotencia del contrato y el fallback regional existente de HU-15-03, sin crear una cola offline de escrituras. Los errores exponen errorId y los logs omiten documentos y valores sensibles.

#### REQ-04 `inferred`
> Fuente: taomangalam/server/contract/generated/api.d.ts:614; taomangalam/server/contract/generated/api.d.ts:4836; request HU-01-14, DEC-220 y permisos
> Necesidad: build
Qué: exigir vista.privacidad.acceder para entrar y respetar metrica.consentir y la denegación de escrituras durante impersonación. Por qué: conservar la autorización existente; impersonación permite consultar el historial y no ofrece acciones legales ni de consentimiento.

#### REQ-05 `inferred`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:1678; request HU-01-14, navegación, accesibilidad y QA-01-14-06
> Necesidad: build
Qué: conservar contexto y posición al regresar a V-27, usar panel-modal para documentos y anunciar resultados y cambios de foco de forma accesible, con lectura y acciones utilizables al 200 % en teléfono y tablet. Por qué: permitir revisar y decidir sin perder orientación; aplicar fondo de Identidad/entrada a pantalla completa y superficie legal opaca conforme a V-51 y doc 43 §9.

#### REQ-06 `inferred`
> Fuente: taomangalam/app/lib/design_system/app_theme.dart:308; taomangalam/app/lib/design_system/app_theme.dart:339; taomangalam/app/lib/features/legal/data/puerto_analitica.dart; KB tao181-preferencias-una-sola-clave
> Necesidad: build
Qué: extender el flujo legal, proveedores y sistema de diseño existentes sin crear APIs, stores ni componentes equivalentes paralelos. Por qué: proteger consumidores y contratos ya entregados; reutilizar tokens semánticos, átomos, moléculas y resolvedor de fondos. Todo consumidor de reducción de movimiento afectado debe leer la misma clave versionada mediante PreferenceStoreReducedMotionStore.

## Tasks

#### S1.T1 — S1.T1 · Extender el modo revisión existente de HU-01-13 con listarMisAceptaciones y obtenerDocumentoLegal. Archivos: consumidor de V-51 identificado al aprobar el spec y proveedores legales existentes; referencias de contrato: server/contract/generated/api.d.ts:587, :604 y :4813. Usar limit, cursor y siguienteCursor con el límite confirmado del contrato; mostrar versión aceptada y vigente sin invocar aceptarDocumentosLegales. Implementar carga, error y lectura de caché identificada para este recorrido.
Contrato: rollback: Revertir únicamente el modo de lectura agregado y su conexión con los proveedores; conservar operaciones existentes, caché compatible e historial legal.. Status: pending

#### S1.T2 — S1.T2 · Integrar la entrada de Privacidad y el contenedor compartido de V-51, condicionado a HU-03b-11. Archivos: app/lib/features/cuenta/presentation/cuenta_screen.dart y componentes de V-51 confirmados al aprobar; no sustituir ProvisionalScreenScaffold con una implementación nueva de Cuenta. Verificar vista.privacidad.acceder y modo de solo lectura en impersonación; conservar posición de V-27, restaurar foco al cerrar documentos y proporcionar anuncios reutilizables para el resultado posterior de consentimiento. Reutilizar fondo, panel-modal, tokens y componentes existentes; cualquier transición afectada lee PreferenceStoreReducedMotionStore.
Contrato: rollback: Retirar la entrada y el contenedor de revisión incorporados, restaurando el comportamiento previo de navegación y componentes; mantener Cuenta y preferencias existentes.. Status: pending

#### S1.T3 — S1.T3 · Escribir o ajustar pruebas focalizadas en los archivos concretados al aprobar el spec: QA-01-14-01/02, paginación, carga/error/caché legal, acceso denegado, lectura en impersonación y retorno/foco. Verificar que ninguna lectura registra aceptación y que el flujo obligatorio de HU-01-13 mantiene su comportamiento. Preparar capturas de lectura en teléfono/tablet al 200 % para revisión humana de accesibilidad y fidelidad.
Contrato: rollback: Revertir las pruebas y fixtures agregados y retirar las capturas de esta etapa; no modificar registros legales ni fixtures compartidos fuera del alcance.. Status: pending

#### S2.T1 — S2.T1 · Extender V-51 y app/lib/features/legal/data/puerto_analitica.dart para consumir obtenerEstadoConsentimiento y registrarConsentimientoAnalitica existentes, junto con la política de HU-15-03. Presentar acciones equivalentes en opt_in, explicación y retirada según opt_out, y ninguna acción inadmisible en disabled. Actualizar la vista solo con respuesta confirmada, sin sustituir ni borrar eventos previos. Reutilizar la autorización de S1.T2 y tratar denegaciones del backend sin éxito visual; no implementar lógica regional ni backend nuevo.
Contrato: rollback: Revertir la presentación y conexión de cambios de consentimiento incorporadas, dejando disponible la revisión legal; mantener los eventos append-only ya registrados.. Status: pending

#### S2.T2 — S2.T2 · Completar el comportamiento de fallo y recuperación del consentimiento en V-51 y app/lib/features/legal/data/puerto_analitica.dart. Escritura requiere red; conservar el último estado confirmado ante error o respuesta perdida y reutilizar la idempotencia literal confirmada del contrato para reintentar. Distinguir política no disponible y política desconocida; consumir el fallback existente de server/src/privacidad/politica-analitica.ts: opt_in, requiereConsentimiento=true, versión 0. No introducir cola offline ni store paralelo. Usar los anuncios accesibles compartidos, errorId y logging existente sin documentos ni valores sensibles.
Contrato: rollback: Revertir únicamente los estados y conexiones de recuperación añadidos; conservar el estado confirmado y los eventos del servidor, sin reescribir datos locales ni remotos.. Status: pending

#### S2.T3 — S2.T3 · Escribir o ajustar únicamente pruebas focalizadas cuyos archivos y comandos se concretan al aprobar: QA-01-14-03/04/05, las tres políticas, política desconocida/no disponible, denegación por permisos, respuesta perdida y reintento idempotente. Verificar append-only, conservación del estado confirmado y anuncios de éxito/error. Cubrir regresión del puerto existente y preferencias en consumidores afectados; producir capturas de los estados de consentimiento para QA-01-14-06 y registrar revisión en teléfono/tablet, VoiceOver/TalkBack y escala 200 %. La regresión completa corresponde al gate de cierre.
Contrato: rollback: Revertir las pruebas y fixtures agregados y retirar las capturas de esta etapa; no borrar eventos de consentimiento ni cambiar datos de producción.. Status: pending

## Verificacion runtime

1. **Qué:** Verificar en runtime: Qué: presentar en V-51 el historial propio de términos y privacidad con versión y fecha, consultar los textos aceptados y vigentes, y distinguir si corresponde nueva aceptación. Por qué: permitir revisar decisiones sin registrar aceptación al abrir o leer. Consumir listarMisAce
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
2. **Qué:** Verificar en runtime: Qué: conservar contexto y posición al regresar a V-27, usar panel-modal para documentos y anunciar resultados y cambios de foco de forma accesible, con lectura y acciones utilizables al 200 % en teléfono y tablet. Por qué: permitir revisar y decidir sin perder orientación; apli
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket

## Cambios al modelo de datos

Ninguno.
