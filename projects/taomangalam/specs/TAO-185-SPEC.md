---
id: TAO-185-SPEC
project: taomangalam
ticket: TAO-185
status: approved
---

# TAO-185 · HU-01-13 · V-51: lectura y aceptación legal obligatoria

## Resumen ejecutivo

Implementar V-51 para primer uso y reaceptación, con lectura completa, analítica regional y retorno conservado.
Integrar los proveedores legales de TAO-192 y de analítica de TAO-189; no construir backend, persistencia, colas ni redactar documentos.
Reutilizar navegación, fondos, tokens, componentes, localización y preferencias existentes; las fixtures solo permiten revisión provisional.
Verificar instalación nueva, aceptación online/offline, versiones pendientes y rechazos mediante pruebas acotadas, dispositivos y capturas; Diseño debe aprobar QA-01-13-04.
Estimación: 3 sesiones T2 de hasta 3 horas, condicionadas a proveedores disponibles; conservar los 5 puntos publicados y no cerrar con integraciones simuladas solamente.
Datos a confirmar antes de ejecutar:
- Firmas, adaptadores y archivos de obtenerDocumentosLegalesVigentes, obtenerDocumentoLegal, aceptarDocumentosLegales y obtenerPoliticaAnalitica: confirmar en TAO-192, TAO-189 y sus contratos integrados.
- Interfaces de registro local, decisiones de analítica y notificaciones version_legal_pendiente/documento_legal_modificado, incluida aceptación diferida: confirmar con HU-03a-11/12/13 y HU-15-03/04.
- Ubicación del componente V-51 y archivos de integración de splash/introducción: fijar durante design-feature contra la rama acumuladora antes de aprobar el spec; no asumir rutas nuevas.
- Versiones y ubicación de textos empaquetados, fixtures y derivados de familia-identidad-entrada.png: confirmar HU-03a-10/14/15, TAO-192 y app/assets/manifest.json.
- Harness, capacidades, grants y expiración; disponibilidad del juez de spec y revisores de Diseño/QA: confirmar al iniciar. Skip teach ya está aprobado; el permiso de epic/EP-01 no autoriza entrega a main. El MCP Kanai no está disponible en este host: su preaprobación, copia al ticket y gates permanecen pendientes.

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:1650

Qué: presentar V-51 obligatoria tras la splash y antes de cualquier introducción, con «Privacidad y consentimientos», Términos y Privacidad versionados y explicación de qué datos trata la app, dónde viven y por qué aceptar es necesario. Sin aceptación, mantener el bloqueo de navegación y permitir releer, incluso al volver a la app; la vista no se filtra por permisos. Por qué: garantizar una decisión informada antes de acceder al resto.

### REQ-02 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:1668

Qué: abrir el texto completo de cada documento y regresar al mismo punto de V-51; mostrar carga, error con Reintentar y texto empaquetado sin red. Identificar errores de carga con errorId sin datos personales, y no mostrar datos de consultas. Por qué: permitir leer íntegramente los documentos sin perder contexto ni depender de conectividad.

### REQ-03 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:1654

Qué: consumir obtenerPoliticaAnalitica y presentar opt_in con Aceptar analítica/Rechazar analítica equivalentes, opt_out con aviso de actividad e instrucciones para desactivarla, y disabled sin bloque. Delegar el registro a HU-15-03/04, sin usar el consentimiento para perfilar. Por qué: respetar la política regional sin inducir la elección.

### REQ-04 `confirmed`
> Fuente: Request TAO-185 · Adenda 1 - 2026-10-08 - dev (edobacon); Alcance «Aceptar y continuar invoca la aceptación de HU-03a-11 (con conexión) o el registro local de HU-03a-12 (sin conexión)»; casos QA-01-13-01, QA-01-13-02, QA-01-13-03

Qué: Aceptar y continuar delega la aceptación versionada a HU-03a-11 con red y a HU-03a-12 sin red; continúa a Inicio y su introducción, o al contexto conservado, cuando el proveedor confirma el resultado. Mantener la verificación de documento_legal.aceptar en el servidor. Por qué: conectar la presentación con los mecanismos legales existentes sin duplicar persistencia ni cola. La adenda 1 del pedido sanciona que la QA en teléfono Android y tablet con modo avión real (QA-01-13-01, 02 y 03) y la auditoría con lectores de pantalla (FU-12) quedan diferidas a la entrega del arte de HU-02 (FU-22); sus casos se verifican con widget tests y con el recorrido en el simulador de iOS.

### REQ-05 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:1661

Qué: presentar V-51 al abrir con versiones pendientes, ante version_legal_pendiente en cualquier pantalla y ante rechazos inmediatos o diferidos; mostrar «Actualizamos este documento. Revísalo para continuar», seleccionar solo documentos que requieren aceptación vigente y conservar el contexto anterior hasta aceptar. Por qué: resolver cambios legales sin perder el retorno ni aceptar versiones obsoletas.

### REQ-06 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:1666

Qué: en teléfono presentar un bloque por documento y acciones al final; en tablet horizontal mostrar resumen y texto lado a lado. Admitir textos variables sin cortes y escala 200 %, con foco inicial en el título y lectura accesible. Por qué: permitir completar la aceptación en teléfono, tablet y con ayudas de accesibilidad.

### REQ-07 `confirmed`
> Fuente: Request TAO-185 · Adenda 1 - 2026-10-08 - dev (edobacon); Referencias canónicas (fondo heredado, DEC-235, maqueta-direccion-consolidada.png); caso QA-01-13-04 [fidelity]

Qué: entregar la composición visual de V-51 como panel-modal a pantalla completa: primer uso con el fondo Identidad/entrada de V-31, actualizaciones con el fondo anfitrión y texto legal sobre superficies opacas. Por qué: cumplir doc 43 §9, DEC-235 y la aprobación de Diseño requerida para cerrar. La adenda 1 del pedido sanciona que la aprobación de Diseño del fondo y la composición de V-51 (casos de fidelidad REQ-07-3 y REQ-07-4, QA-01-13-04) queda diferida a la entrega del arte de HU-02 (FU-22 y FU-25), con lo que esa condición de cierre se modifica de forma explícita; esta historia verifica la estructura de la composición y el respaldo de la capa de fondo, no su fidelidad visual.

### REQ-08 `confirmed` `enforcement`
> Fuente: taomangalam/app/lib/core/images/background_layer.dart:89; taomangalam/app/lib/design_system/app_theme.dart:345; taomangalam/app/lib/design_system/overlays/tao_banner_host.dart:24; taomangalam/app/lib/l10n/app_localizations.dart:412

Qué: reutilizar TaoBackgroundLayer, las opacidades semánticas, los átomos y la localización ARB existentes; usar TaoBannerHost cuando el error se presente como banner, conservando su única ranura y retirada tras reintento exitoso. Por qué: evitar un sistema paralelo y proteger los consumidores integrados; las coincidencias disabled del tema son opacidad, no política de analítica.

### REQ-09 `confirmed` `enforcement`
> Fuente: taomangalam/app/lib/core/preferences/preference_reduced_motion_store.dart:18; taomangalam/app/lib/core/preferences/preference_reduced_motion_store.dart:26

Qué: consumir las preferencias de accesibilidad desde PreferenceStore y resolver movimiento reducido mediante PreferenceStoreReducedMotionStore; no crear stores ni claves paralelas para V-51 o sus transiciones. Por qué: preservar la preferencia aplicada en runtime y después de reiniciar, conforme a la regla normativa de EP-01.
## Tasks

#### S1.T1 — Completar intake-explore → teach-intake respetando Skip ya aprobado → design-feature. Contrastar KB y origin/main, fijar los archivos del componente V-51 y de los proveedores pendientes del summary, y documentar contratos sin construirlos. Reusar el navegador raíz comprobado en app/test/navigation/app_shell_integration_test.dart:101 y el fondo existente. Obtener preaprobación del juez de spec antes de aprobar, copiar estas tasks al ticket y habilitar request-execute solo después. Certeza confirmed para el flujo solicitado; firmas y ubicaciones pendientes deben quedar resueltas en el spec aprobado.
Contrato: rollback: Retirar únicamente el plan no aprobado o corregir sus contratos; no iniciar ejecución ni cambiar proveedores, permisos o datos.. Status: done

#### S1.T2 — Implementar la presentación y lector de V-51 en los archivos fijados al aprobar el spec; integrar la superficie con app/lib/navigation/app_shell.dart y textos en app/lib/l10n/app_es.arb. Mostrar título, versiones y explicación; conservar desplazamiento y selección al leer y volver. Añadir estados de carga, errorId sin datos personales, Reintentar y lectura empaquetada. Resolver teléfono/tablet, 360 × 800 al 200 % y foco al título. Certeza confirmed; fuentes: backlog EP-01:1650,1666,1668,1732. Reutilizar TaoBackgroundLayer de app/lib/core/images/background_layer.dart:89, tema, átomos y banner existentes, y PreferenceStoreReducedMotionStore de app/lib/core/preferences/preference_reduced_motion_store.dart:18. Entregar el fondo/composición de esta historia sin crear un nuevo resolvedor ni stores.
Contrato: rollback: Revertir la presentación, lector y claves nuevas de V-51; conservar versiones empaquetadas, infraestructura visual y preferencias existentes.. Status: done

#### S1.T3 — Añadir casos de lector, carga/reintento, retorno al mismo punto, texto empaquetado y foco a app/test/navigation/app_shell_integration_test.dart. Extender app/test/goldens/background_layer_golden_test.dart con la composición de V-51 en teléfono/tablet, escala 200 % y contraste aumentado; ajustar app/test/navigation/app_shell_live_preferences_test.dart para verificar movimiento reducido al abrir V-51 y después de remontar con preferencias persistidas. Certeza confirmed: pruebas existentes verificadas en origin/main; escribir exclusivamente los escenarios de esta etapa y conservar su cobertura anterior.
Contrato: rollback: Revertir solo los casos y referencias visuales añadidos en esta sesión, conservando las pruebas existentes y sin regenerar aprobaciones visuales automáticamente.. Status: done

#### S2.T1 — Integrar el primer uso obligatorio y la aceptación en los archivos de splash/introducción y proveedores fijados en el spec, junto a app/lib/navigation/app_router.dart y la presentación V-51. Invocar literalmente obtenerDocumentosLegalesVigentes, obtenerDocumentoLegal y aceptarDocumentosLegales mediante los contratos confirmados de TAO-192; delegar el registro sin red a HU-03a-12 usando las versiones empaquetadas. Mantener V-51 si no se acepta o el proveedor falla/deniega documento_legal.aceptar; continuar a Inicio e introducción solo con confirmación online o local. No implementar persistencia ni cola. Certeza confirmed; fuentes: backlog EP-01:1658,1660,1664,1728.
Contrato: rollback: Revertir las conexiones nuevas y conservar el flujo obligatorio de primer uso, documentos empaquetados y registros locales pendientes; no borrar aceptaciones ni sustituir el bloqueo por acceso libre.. Status: done

#### S2.T2 — Conectar obtenerPoliticaAnalitica y los proveedores de HU-15-03/04 preparados por TAO-189 en la presentación V-51 fijada en el spec; añadir textos por clave en app/lib/l10n/app_es.arb. opt_in muestra Aceptar analítica y Rechazar analítica del mismo tamaño, estilo, ubicación y peso semántico; opt_out informa actividad y desactivación; disabled omite el bloque. Delegar decisiones al proveedor sin stores propios ni perfilado. Certeza confirmed; fuente backlog EP-01:1654; app_theme.dart:320 describe opacidad disabled y no es fuente de política regional.
Contrato: rollback: Revertir únicamente la conexión y presentación regional nueva; conservar decisiones de consentimiento ya registradas por sus proveedores.. Status: done

#### S2.T3 — Extender app/test/navigation/app_shell_integration_test.dart con instalación nueva tras splash, bloqueo al salir/volver, vista no filtrable, políticas opt_in/opt_out/disabled, elección equivalente y aceptación online/offline. Usar contratos simulados confirmados para comprobar versiones enviadas, continuidad solo con confirmación y fallos de permiso/registro. Ajustar los fixtures de pruebas existentes para representar aceptación ya vigente y conservar navegación a Biblioteca. Escribir QA-01-13-01/02 sin duplicar los casos del lector de la sesión anterior. Certeza confirmed; fuentes backlog EP-01:1700,1702,1704,1708,1716,1739 y app/test/navigation/app_shell_integration_test.dart:35,59.
Contrato: rollback: Revertir los casos y ajustes de fixtures de esta etapa; mantener pruebas anteriores y no alterar registros legales reales.. Status: done

#### S3.T1 — Integrar en app/lib/navigation/app_router.dart y la presentación V-51 los eventos de HU-03a-13 y respuestas de HU-03a-11/12 fijados en el spec. Al abrir con versiones pendientes, recibir version_legal_pendiente o documento_legal_modificado, seleccionar por tipo/version/exige_reaceptacion y aceptación vigente, actualizar el texto, mostrar el aviso y conservar el retorno original. Reutilizar los mecanismos de lectura y aceptación de las sesiones previas; no implementar bloqueo del servidor, cola ni revisor posterior HU-01-14. Mantener el fondo anfitrión ya resuelto. Certeza confirmed; fuentes backlog EP-01:1661,1669,1690.
Contrato: rollback: Revertir la nueva conexión de eventos conservando el flujo obligatorio de primer uso, el contexto de retorno y aceptaciones locales pendientes; no descartar ni dar por aceptada una versión rechazada.. Status: done

#### S3.T2 — Añadir a app/test/navigation/app_shell_integration_test.dart los casos de selección de documentos, QA-01-13-03, version_legal_pendiente desde otra pantalla, documento_legal_modificado inmediato, rechazo diferido al reconectar y versión que no exige reaceptación. Comprobar versiones y contexto de retorno, incluyendo que Términos vigente no reaparece por actualización de Privacidad. Mantener la regresión de navegación existente; no reescribir casos de lectura, políticas o primer uso cubiertos antes. Certeza confirmed; fuentes backlog EP-01:1710,1712,1714,1743 y app/test/navigation/app_shell_integration_test.dart:59.
Contrato: rollback: Retirar únicamente los nuevos escenarios de reaceptación y sus fixtures, preservando la cobertura de las sesiones anteriores.. Status: done

#### S3.T3 — Ejecutar QA-01-13-01/02/03 contra los proveedores reales integrados de TAO-192 y TAO-189: comprobar aceptación por documento, cola local y sincronización, políticas regionales, rechazos y retorno. Revisar teléfono Android/tablet, modo avión y lector de pantalla. Capturar opt_in/opt_out/disabled en teléfono y tablet y obtener QA-01-13-04 de Diseño contra doc 43 §9 y maqueta-direccion-consolidada.png; revisar el fondo de V-51 como entregable de esta historia. Completar request-close con regresión completa en el gate y teach-close según Skip aprobado. No cerrar si faltan proveedores o aprobación visual; entrega a main requiere autorización distinta del lote epic/EP-01. Certeza confirmed; fuentes backlog EP-01:1739,1741,1743 y request inmutable.
Contrato: rollback: Ante fallo, mantener el ticket abierto y revertir solo los cambios de presentación/integración responsables, conservando documentos empaquetados, cola pendiente y retorno; conservar evidencia del fallo sin datos personales.. Status: done
## Verificacion runtime

1. **Qué:** Verificar en runtime: Qué: presentar V-51 al abrir con versiones pendientes, ante version_legal_pendiente en cualquier pantalla y ante rechazos inmediatos o diferidos; mostrar «Actualizamos este documento. Revísalo para continuar», seleccionar solo documentos que requieren aceptación vigente y conse
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
2. **Qué:** Verificar en runtime: Qué: entregar la composición visual de V-51 como panel-modal a pantalla completa: primer uso con el fondo Identidad/entrada de V-31, actualizaciones con el fondo anfitrión y texto legal sobre superficies opacas. Por qué: cumplir doc 43 §9, DEC-235 y la aprobación de Diseño requ
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket

## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3

**Gate (auto)**: En preview de teléfono y tablet se puede abrir V-51, leer ambos documentos, volver al mismo punto y revisar carga, error y texto empaquetado; la composición y el foco son observables.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2
- [x] S2.T3

**Gate (auto)**: Una instalación nueva muestra V-51 antes de la introducción; las tres políticas regionales son revisables y aceptar con red o en modo avión permite llegar a Inicio mediante los proveedores correspondientes.

### Session 3 · T2 · iterate

**Tasks:**
- [x] S3.T1
- [x] S3.T2
- [x] S3.T3

**Gate (auto)**: Tras las correcciones del review, la reaceptación legal (actualización de Privacidad, bloqueo recibido desde otra pantalla y rechazos inmediato/diferido) muestra la versión vigente y devuelve al contexto anterior al aceptar; el gate legal bloquea a pantalla completa mientras resuelve (carga y error) y no permite alcanzar Inicio; la suite del paquete app queda verde. La QA en dispositivo y la aprobación de Diseño se registran en la sesión de verificación y en los casos de fidelidad.

### Session 4 · T0 · continue

### Session 5 · T2 · continue

**Gate (auto)**: La reaceptación legal (actualización de Privacidad, bloqueo recibido desde otra pantalla y rechazos inmediato/diferido) muestra la versión vigente y devuelve al contexto anterior al aceptar; el gate legal bloquea a pantalla completa mientras resuelve (carga y error) y no permite alcanzar Inicio.
## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-04 (edit) `confirmed`: Qué: Aceptar y continuar delega la aceptación versionada a HU-03a-11 con red y a HU-03a-12 sin red; continúa a Inicio y su introducción, o a
- REQ-07 (edit) `confirmed`: Qué: entregar la composición visual de V-51 como panel-modal a pantalla completa: primer uso con el fondo Identidad/entrada de V-31, actuali

