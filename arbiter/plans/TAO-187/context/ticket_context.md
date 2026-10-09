# Ticket TAO-187 (GH-65, HU-01-19) - Aviso descartable de actualizacion recomendada
work_type: implement · estado: ready_to_close · modulo: EP-01 · spec: approved
(Se quito del contexto la evidencia de los criterios de gate y todo veredicto de gates previos.)

## Pedido (request)

Objetivo: que, si hay una version recomendada mas nueva, la app muestre un aviso que se puede posponer y que lleva a actualizar, sin impedir seguir usando la app.

Incluye:
- Modal descartable (dialogo de HU-01-05) con titulo, version disponible (versionRecomendada), mensaje y notas breves cuando existan, y acciones Actualizar (abre urlTienda de la plataforma) y Mas tarde (cierra el aviso) (DEC-086).
- Dos disparadores: al abrir la app con conexion cuando obtenerVersionApp responde actualizacion_recomendada; y desde Buscar actualizaciones de Acerca de (HU-10-12), que presenta este mismo modal.
- Mas tarde cierra el aviso para esa sesion; la siguiente apertura normal con conexion vuelve a comprobar y lo muestra si la recomendacion sigue vigente.
- Tambien se cierra con Atras, Escape y toque exterior, con el mismo efecto que Mas tarde.
- No se superpone a otro modal: si V-51 o el modal introductorio estan visibles, se presenta al cerrarse; si el estado es actualizacion_obligatoria, rige HU-01-18 y este aviso no aparece.
- Sin conexion o si el servicio no responde, no aparece.
- Con urlTienda nula, Actualizar queda deshabilitado con el motivo y se registra un error de configuracion, como en HU-01-18.
- Titulo, mensaje y etiquetas por clave i18n (DEC-166): el contrato VersionApp no trae titulo ni mensaje; telefono y tablet; movimiento reducido en la entrada.

No incluye: modal obligatorio y reaccion al 426 (HU-01-18); lectura publica de version (HU-03a-09); registro de releases (EP-17); boton Buscar actualizaciones y su resultado al_dia (HU-10-12).

Requisitos transversales: la URL solo proviene del servidor; la peticion solo envia plataforma y version; foco al titulo al abrir y devuelto al cerrar; lector de pantalla anuncia titulo, version y mensaje; objetivos tactiles minimos; observabilidad de aparicion y eleccion con plataforma, compilacion y disparador, sin datos personales; urlTienda nula registrada como error; la comparacion usa el numero de compilacion (DEC-086). Sin conexion nunca bloquea el uso. Ninguna tabla local nueva.

Criterios de aceptacion: compilacion 18 con recomendada 20 y minima 15 -> tras la splash aparece el modal con version 20, mensaje, Actualizar y Mas tarde; Mas tarde cierra y se usa la app; vuelve a aparecer en la siguiente apertura con conexion si sigue vigente; Actualizar abre urlTienda; con obligatoria solo el modal de HU-01-18; sin conexion no aparece; con V-51 visible espera a que V-51 y el modal introductorio se cierren; urlTienda nula -> Actualizar deshabilitado con motivo y Mas tarde funciona; 360x800 a 200 % y tablet horizontal sin cortes, movimiento reducido = fundido breve o inmediato; sin fondo propio, se ve el de la vista anfitriona tras el scrim, texto sobre superficie opaca.

## Adendas al request
(ninguna)

## REQs del spec (todos approved)
- REQ-01: modal con titulo i18n, versionRecomendada, mensaje i18n, notas solo si existen, Actualizar (abre urlTienda) y Mas tarde.
- REQ-02: pospuesto por sesion: Mas tarde, Atras, Escape y toque exterior con el mismo efecto; no reaparece en la misma sesion; se vuelve a comprobar en la siguiente apertura con conexion.
- REQ-03: tras la splash solo si obtenerVersionApp responde actualizacion_recomendada; sin conexion, con error o sin respuesta no aparece; con obligatoria rige HU-01-18; comparacion por numero de compilacion.
- REQ-04: no se superpone: si V-51 o el modal introductorio estan visibles al llegar la respuesta, se presenta cuando ambos se cierran.
- REQ-05: urlTienda nula -> Actualizar deshabilitado mostrando el motivo, Mas tarde funciona, se registra error de configuracion igual que en HU-01-18.
- REQ-06 (inferred): punto de entrada reutilizable que presenta este modal a partir de una VersionApp recomendada para HU-10-12 (disparador manual), sin implementar el boton ni al_dia.
- REQ-07: foco al titulo y devuelto al origen; lector anuncia titulo, version y mensaje; objetivos tactiles minimos; sin cortes en 360x800 al 200 % ni tablet horizontal; movimiento reducido = fundido breve o inmediato; sin fondo propio (DEC-235).
- REQ-08: registrar aparicion y eleccion (Actualizar o Mas tarde/descartar) con plataforma, compilacion y disparador (apertura | manual), sin datos personales.
- REQ-09 (enforcement): reutilizar el dialogo de HU-01-05, el modelo generado VersionApp, las claves ARB de HU-01-06 con su lint, y el cliente de version, la apertura de tienda y el registro de urlTienda nula de HU-01-18.
- REQ-10 (enforcement): el movimiento reducido se lee solo por el servicio de HU-01-07 via PreferenceStoreReducedMotionStore (clave versionada unica), sin leer movimiento_reducido ni crear un store paralelo.

## Sesiones y criterio de gate (promesa)
- S1: widget tests del modal en verde y entrada en Widgetbook con los casos con notas, sin notas, urlTienda nula y movimiento reducido, mas capturas de telefono y tablet.
- S2: la integracion contra el servidor local muestra el modal tras la splash con recomendada 20; no aparece con 500, sin red ni con obligatoria; espera a V-51 y al modal introductorio; no se repite en la sesion tras Mas tarde; los tests unitarios de la decision estan en verde.

## Test cases esperados (titulo)
QA-01-19-01 aparece y Actualizar abre la tienda (iPhone, staging); QA-01-19-02 pospuesto no reaparece en la misma sesion; QA-01-19-03 error 500 -> sin aviso; QA-01-19-04 [fidelity] revision visual de Diseno contra maqueta (humana, fuera del alcance de un juez de codigo).

## Alcance de esta corrida
ticket_scope: whole_ticket (sesiones S1 y S2 completas; la sesion 3 esta vacia). Base: d7abe68 (commit anterior a GH-65 en la rama compartida epic/EP-01a).
