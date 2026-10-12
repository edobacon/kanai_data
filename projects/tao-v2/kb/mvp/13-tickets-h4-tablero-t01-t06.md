---
id: DOC-kb-mvp-13-tickets-h4-tablero-t01-t06
project: tao-v2
type: doc
tags:
  - mvp
  - tickets
  - app
  - tablero
  - recordatorios
---

# MVP tao-v2: tickets H4, tablero T01 a T06c

Fichas de T01a a T06c (17 tickets), revisadas contra el análisis de frontend y el material de diseño (`03-referencia-de-diseno-y-muestras`, guías 09 a 13 del plan V3). Formato en `01-ficha-de-ticket`. Repo `tao-v2`, `app/`. Cuentas externas: ninguna. Verificación: emulador. Todo ticket de UI incluye en su cuerpo el bloque estándar de línea visual de `03`. Los tickets de motor (sufijo `a`) no incluyen UI; los de UI (`b`, `c`, `d`) no cambian el motor. Los T locales dependen de A00 y A05, no de la cuenta en servidor: solo los que consumen unidades dependen de servidor (T03a, T06).

Estado del motor: Drift en versión 5 con DDL en `app/lib/data/drift/esquema_v1.dart` a `esquema_v5.dart`; la migración v6 la hace A05 y los cambios de esquema posteriores van en T07a. Catálogos empaquetados en `app/assets/catalogos/` (9 JSON). Regla del tablero que gobierna todo el recorrido: una consulta, una acción siguiente clara; no hay botón universal que permita lanzar otra tirada saltándose pendientes.

## T01a. Inicio (V-01)

- Tipo: implement. Cambio: P (de FE-T01). Depende de: A00, A05.
- Diseño: muestra 01 izquierda (consulta en curso) y 11 derecha (sin consultas); familia Inicio.
- Entregable: Inicio con consulta personal activa (Casa, movimiento, práctica pendiente; continuar, ver todas, crear nueva; sin nombre de consultante ni ilustración en la tarjeta) y Inicio sin consultas (una sola acción principal, Nueva consulta, y una explicación breve de que se guarda en esta instalación, sin asistente de varias pantallas); estados borrador, activo y cerrado desde las proyecciones reales.
- Aceptación local: en emulador, el listado se actualiza tras cambios persistidos y volver conserva el contexto; con cero consultas solo aparece Nueva consulta.
- Datos y fixtures: consultas por estado y lista vacía. Recursos: R05, R07, R08. Assets: fondo Inicio.

## T01b. Consultas (V-44) y Acerca de (V-45)

- Tipo: implement. Cambio: P. Depende de: T01a.
- Diseño: sin muestra; V-44 con la familia Perfil y consultas y V-45 con la familia Biblioteca; se apoya en la ficha funcional.
- Entregable: lista de consultas que reemplaza las 60 consultas ficticias de la maqueta; Acerca de con el catálogo existente; V-45 se asigna aquí de forma explícita.
- Aceptación local: la lista viene del repositorio real; Acerca de muestra contenido local real.
- Datos y fixtures: fecha y progreso conocidos. Recursos: R05, R07, R08.

## T02a. Motor de personalidad del consultante

- Tipo: implement. Cambio: P (de FE-T02). Depende de: A00.
- Entregable: cálculo puro y reproducible del número personal (suma de dígitos de la fecha reducida) y del signo; recálculo al corregir la fecha, con la lista de consultas asociadas afectadas, para mostrar el impacto antes de guardar (DEC-038); pruebas con fixtures canónicos.
- Aceptación local: el cálculo coincide con el fixture canónico (ejemplo de diseño: 12/07/1991 suma 30, se reduce a 3 y corresponde a Cáncer) y funciona sin red; no usa API de astrología; corregir la fecha recalcula número, signo y consultas asociadas.
- Datos y fixtures: fechas límite, datos inválidos y resultados calculados de antemano. Recursos: R07. Datos externos: fixture canónico (fuentes de `docs/sources/`) y `signos_personalidades.v1.json`. Verificación: pruebas del motor.

## T02b. Mi perfil y personalidad (V-28, V-29)

- Tipo: implement. Cambio: P. Depende de: T02a, T01a.
- Diseño: muestras 15, 16 y 17; familia Perfil y consultas; guía `11`.
- Entregable: Mi perfil con solo nombre y fecha de nacimiento, globales para los recorridos propios (sin foto, género, rol, cartera de consultantes ni selector de otras personas; el recorte V3 prevalece sobre las menciones históricas); resumen Mi personalidad (identidad, número y signo); Por mi número (síntesis estándar con luces y sombras separadas); Por mi signo (lámina original, palabra fuerte y ecuación) con los dos bloques contiguos (hombre y mujer) con lectura desplazable y sin pedir género; corrección de fecha con vista previa del impacto; la ilustración del perfil es editorial, no una foto. Funciona con identidad local, sin exigir cuenta completa. Fuera: características generales, trabajo, amor, listas avanzadas, explicación del cálculo, galería libre de signos, selector manual del número.
- Aceptación local: en emulador el teclado no oculta campos, el perfil persiste sin red, las lecturas largas se desplazan sin encoger el texto, y las filas de acción miden al menos 56 dp.
- Recursos: R05, R06, R07, R08. Assets: `perfil-consultante-tarjeta`, láminas de los 12 signos, fondo Perfil.

## T03a. Adaptador de validación de unidad

- Tipo: implement. Cambio: P (de FE-T03). Depende de: A00, A03a, B5-02.
- Entregable: `PuertoValidacionUnidad` con su adaptador contra `validarYUsarUnidad`; `Idempotency-Key` persistida; estado pendiente y reintento; reconciliación local tras respuesta perdida; los IDs de producto (Kuberani, Corrector) vienen del seed (D-06), no de un catálogo.
- Aceptación local: en emulador contra API real, una respuesta perdida y reintento no consume dos veces; sin red no se persiste el código crudo; el código no se guarda en logs ni en cola.
- Datos y fixtures: K-DISP, K-CAND, K-USADA, respuesta perdida. Recursos: R02, R08, R09. Información por confirmar: ULIDs de los productos publicados por el seed de B5-02 (que incluye el seed de productos de B5-01).

## T03b. Crear e iniciar consulta (V-02, V-39)

- Tipo: implement. Cambio: P. Depende de: T03a, T02b.
- Diseño: muestra 02 derecha (V-39); V-02 sin muestra; familia Perfil y consultas para V-02 y la del anfitrión para V-39.
- Entregable: Nueva consulta con preparación de perfil y propósito (borrador), y la validación del código del Kuberani (campo con formato, ayuda "encontrarás el código en tu unidad física", aviso de que requiere conexión, Validar e iniciar, Volver al borrador); inicio en Casa 1 solo tras validar; el mismo patrón sirve a la renovación y al corrector dentro de su contexto y hereda su fondo (en reparación, Retroceso).
- Aceptación local: en emulador, solo una unidad disponible inicia una vez en Casa 1; un error no inicia ni pierde el borrador; volver al borrador conserva lo escrito; sin catálogo, inventario, cámara ni escáner.
- Datos y fixtures: unidad confirmada por productor (PRD-A), candidato, inválida, usada. Recursos: R02, R05, R07, R08, R09.

## T04a. Detalle de consulta y siguiente acción (V-03)

- Tipo: implement. Cambio: P (de FE-T04). Depende de: T01b.
- Diseño: sin muestra; familia Perfil y consultas.
- Entregable: detalle con posición, resumen del último movimiento y la siguiente acción permitida según el estado (leer indicaciones, completar práctica, retomar reparación, preparar una nueva tirada o continuar cierre); la navegación conserva consulta, fase y punto de lectura; volver sale del detalle y no borra la práctica.
- Aceptación local: en emulador, las acciones habilitadas cambian según la fase y reabrir la app recupera el paso pendiente; se prueba con una consulta sembrada por el motor, sin servidor.
- Recursos: R05, R07, R08.

## T04b. Tablero y organismos del mandala (V-32)

- Tipo: implement. Cambio: P. Depende de: T04a, A06.
- Diseño: muestras 01 derecha y 23; familia Recorrido; la geometría de las muestras es ilustrativa: se implementa desde el SVG canónico.
- Entregable: tablero con posición actual, ocho bandas radiales visibles, números de las Casas en la corona interior, eje superior entre las Casas 12 y 11 y secuencia antihoraria; solo la Casa actual abre su ficha (no hay biblioteca libre de las doce); práctica pendiente con acceso a práctica e historial; intentar registrar una tirada con pendientes explica el pendiente y dirige al plan sin crear tirada.
- Aceptación local: posición y contenido correctos en teléfono y tablet con texto grande; tocar otra Casa no abre su ficha; no requiere animación para operar.
- Datos y fixtures: posiciones de las doce Casas. Recursos: R05, R06, R07, R08. Assets: fondo Recorrido.

## T04c. Preparar sesión y ritual (V-04)

- Tipo: implement. Cambio: P. Depende de: T04b.
- Diseño: muestras 10 izquierda, 18 y 21; familia Recorrido; guía `11`.
- Entregable: asistente Materiales, Ritual, Dados, Revisión como un solo flujo; Materiales con la ilustración de los dados físicos, campanilla y péndulo (el resto en texto, sin inventario ni marcadores de posición); seis pasos del ritual con su imagen y el texto íntegro del catálogo `ritual_sesion.v1.json` (mantel exclusivo, tablero y Dharani Deva, vela, campanilla dos veces, concentración y agradecimiento, dados y péndulo con tres soplidos), sin casillas de cumplimiento; la primera vez se guían los seis pasos, después hay recordatorio completo con la guía siempre disponible; sin audio, sin simular la campanilla y sin registrar respuestas del péndulo; Japa mala no se agrega.
- Aceptación local: en emulador se recorren los seis pasos en orden y se vuelve sin perder el contexto; ritual y materiales accesibles sin URL remota.
- Datos externos: pasos desde el catálogo. Recursos: R05, R06, R07, R08. Assets: `accion-preparar-sesion-tarjeta`, `accion-registrar-tirada-tarjeta`, miniaturas de campanilla y péndulo, `paso-01` a `paso-06` del ritual (A06).

## T04d. Ficha de Casa (V-05)

- Tipo: implement. Cambio: N (V-05 no tenía ticket en V3). Depende de: T04b, A06.
- Diseño: muestra 05 (Casa 1 llegada y Casa 3 permanencia); familia Recorrido; guía `09`.
- Entregable: una plantilla de lectura reutilizable (no doce pantallas) con cuatro variantes seleccionadas por estado y capacidad: llegada o avance, permanencia, retroceso o reparación (con su Ashura) y Casa 12 (cierre o remisión, sin secciones de reparación). Orden de composición: contexto de consulta, nombre con ilustración protagonista compacta, sentencia de Tao, campos (campo cuántico, dictamen, dirección, Dharani Deva, color, mensaje y acción), Rhema mantra y Logo Shamkya con caracteres exactos, Rhibu y procedimiento, arcano contextual voluntario, y la acción Ir a la práctica (abre V-08 sin marcar cumplimiento). Animal, asset y frase salen del mismo objeto de la Casa de destino en el catálogo (por ejemplo Casa 1: lobo, "Astuto como un lobo"), nunca se deducen de una palabra; si no hay asociación explícita se usa un estado neutro. Abrir la ficha alternativa rotula que no corresponde al estado actual. Controles: filas completas de al menos 56 dp con 12 dp de separación y 16 dp antes de Ir a la práctica, copiar mantra con zona de 48 por 48 dp, encabezado alineado a la izquierda con margen de 24 dp sobre banda marfil opaca y el paisaje en un bloque separado debajo, ilustración que se reduce antes de comprimir texto.
- Aceptación local: en emulador solo se abre la ficha de la Casa actual y no marca cumplimiento; pantallas estrechas, texto ampliado, foco y toques en los extremos de cada fila; contraste de 4,5 a 1 medido con los colores finales; los campos ausentes en la fuente se omiten.
- Recursos: R05, R06, R07, R08. Assets: llegadas, permanencias y animales Ashura de cada Casa (A06). Datos externos: `casas.v1.json` y `resultados.v1.json`.

## T05a. Dados y revisión (V-06)

- Tipo: implement. Cambio: P (de FE-T05). Depende de: T04c.
- Diseño: muestras 06 y 19; familia Recorrido.
- Entregable: captura de los tres dados con controles geométricos (vectores, no assets raster): tocar un dado abre su cuadrícula acotada (D12 de 1 a 12, D8 de 1 a 8, D4 de 1 a 4) y cambia solo ese valor; sin teclado, sin suma o resta repetitiva, sin azar digital ni segunda tirada; revisión de los tres resultados completos, habilitada solo al completarlos; editar vuelve a la captura, cancelar sale sin crear tirada, confirmar crea una sola tirada con idempotencia.
- Aceptación local: en emulador, doble toque no duplica; los rangos se respetan; la revisión incompleta no se habilita; cancelar no deja registro.
- Datos y fixtures: avance, permanencia y retroceso con distintos valores. Recursos: R05, R07, R08.

## T05b. Resultado de movimiento (V-07)

- Tipo: implement. Cambio: P. Depende de: T05a.
- Diseño: sin muestra propia (el estado final aparece en la muestra 23 derecha); familia Recorrido.
- Entregable: resultado con Casa o diagnóstico según el movimiento y la fase y el plan derivados; el D4 solo tiene fuerza cualitativa en retroceso; el texto nunca depende solo de color o imagen.
- Aceptación local: coincide con la clasificación del motor para cada caso. Recursos: R05, R07, R08.

## T05c. Corrección de la última tirada

- Tipo: implement. Cambio: P. Depende de: T05b.
- Diseño: muestra 10 derecha; familia Recorrido.
- Entregable: se abre desde la última tirada registrada (no como otra tirada física): elegir valores, motivo obligatorio, comparar el impacto en resultado y plan y aceptar (con diálogo; el checkbox de la muestra es solo una propuesta visual); conserva el original, recalcula resultado y plan, supersede y recalcula las proyecciones; no permite corregir tiradas intermedias.
- Aceptación local: la corrección conserva la revisión y recalcula; cancelar no cambia resultado ni plan; los dados incorrectos se rechazan.
- Datos y fixtures: corrección que cambia el resultado. Recursos: R05, R07, R08.

## T05d. Animación de registro y recorrido (dentro del MVP, último de su épica)

- Tipo: implement. Cambio: N. Depende de: T05b, T04b.
- Diseño: muestras 22 y 23, demo `24-demo-dados-animaciones.html` y video `25-dados-recorrido-muestra.webm`; guía `12`; DEC-168, DEC-184 y DEC-185. Decidido el 2026-10-12: entra al MVP porque DEC-184 ya acepta el modal de transición tras confirmar la tirada; se ejecuta como último ticket de su épica y no bloquea Q01 (la guía 09 acepta movimiento reducido sin replay ni animación avanzada, y el flujo base funciona sin este ticket).
- Entregable: tras confirmar y guardar la tirada, modal "Registrando tirada" con los tres poliedros dibujados por código (D12 pentagonal de 20 vértices y 12 caras, D8 y D4 triangulares) girando 800 ms con entrada escalonada y caras sin cifras; desvanecimiento de 180 ms; recorrido de la ficha 800 ms por las Casas intermedias en sentido antihorario, atravesando sus centros fuera del símbolo central; destino estable y práctica pendiente; Omitir animación llega al mismo destino. Con movimiento reducido, poliedros estáticos 150 ms y paso directo al resultado. La animación es decorativa: no produce valores, no insinúa que la app lanza los dados (DEC-168) ni cambia el resultado confirmado, y el paisaje no se anima.
- Aceptación local: en emulador, el destino es idéntico con animación, omitida o con movimiento reducido; sin cifras durante el giro; el rendimiento es aceptable en emulador (a medir).
- Recursos: R05, R08.

## T06. Práctica, días omitidos y siguiente tirada (V-08)

- Tipo: implement. Cambio: C (los recordatorios pasan a T06b y T06c). Depende de: T05c, T03a, B5-02, T04d.
- Diseño: muestra 07 izquierda (Día 2 de 3); familia Recorrido.
- Entregable: lo que toca hoy, repeticiones, días consecutivos, cumplido y pendiente; marcar el día como cumplido (un registro por acción y día, sin verificar el ritual, sin sensores ni contador obligatorio); práctica atrasada: informa el retraso y la regla y ofrece Reiniciar o Continuar con advertencia, registrando la decisión y la fecha (DEC-030); las esperas por material, conexión o lectura pendiente no consumen días ni reinician; reglas personales (DEC-115 y DEC-116), sin paneles de consultor y consultante; bloqueo y desbloqueo de la próxima tirada; renovación contextual de Kuberani; reloj inyectable. Ir a la práctica desde la ficha de Casa abre esta vista.
- Aceptación local: en emulador, el bloqueo y desbloqueo cumple las reglas con reloj controlado; persiste sin red y tras terminar y reabrir la app; la renovación online no duplica.
- Datos y fixtures: cambio de día y zona horaria, omisión, reinicio, K-RENOV. Recursos: R02, R05, R07, R08, R09.

## T06b. Motor de recordatorios locales

- Tipo: implement. Cambio: N. Depende de: T06, A05.
- Repo y rutas: `app/lib/data/` (servicio de recordatorios), `app/lib/core/background/` (convertir el spike en servicio real), esquema Drift si se persisten preferencias.
- Entregable: reglas sobre la práctica (qué día y hora, cancelar al cumplir, reprogramar al omitir o corregir), programación idempotente con zona horaria y reloj inyectable, ventana de programación acotada (iOS permite 64 notificaciones pendientes), reprogramación al abrir la app y tras reiniciar el dispositivo, cancelación total al cerrar sesión, eliminar cuenta o cambiar de cuenta (A05); recordatorios por cuenta, sin datos de la persona en el texto.
- Aceptación local: pruebas del motor con reloj controlado; en emulador, programar, cumplir y ver que se cancela; el cambio de cuenta no hereda ni cancela recordatorios ajenos.
- Datos y fixtures: cambio de día y zona, omisión, reinicio, cuenta A y B.
- Recursos: R08, R11. Información por confirmar: si las alarmas exactas de Android son necesarias o basta una hora aproximada; si `workmanager` se mantiene o basta `flutter_local_notifications` con `zonedSchedule`. Extensión v1: el servicio acepta nuevos tipos de recordatorio.

## T06c. Recordatorios: preferencia, permisos y destino (V-27, V-08)

- Tipo: implement. Cambio: N. Depende de: T06b, A02.
- Diseño: SIN muestra. El diseño V3 excluía los recordatorios (guía 09), de modo que la preferencia dentro de V-27 y el estado de permiso hay que diseñarlos con la guía maestra y la línea visual de `03` antes o durante el ticket; familia Cuenta.
- Entregable: preferencia en V-27 (activar o desactivar y hora, D-08); por defecto diario a hora fija elegible y desactivado hasta aceptar el permiso; solicitud del permiso del sistema en el momento oportuno (no al primer arranque); estado "permiso denegado" con camino a Ajustes del sistema; al tocar la notificación se abre V-08; ícono pequeño monocromo de Android.
- Aceptación local: en emulador Android 13 o superior y iOS Simulator: permiso, programación, toque sobre la notificación y estado denegado; cerrar sesión cancela los recordatorios.
- Datos externos: copia del recordatorio en español neutro aprobada por Producto y Contenido; hora por defecto propuesta por Producto.
- Información por confirmar: diseño visual de la preferencia y del permiso; ícono de notificación (no está en el inventario, derivar del logo).
- Recursos: R05, R06, R08, R11. Assets: ícono de notificación.
