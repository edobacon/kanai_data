# Contexto del ticket TAO-211 (GH-84), lo pedido y lo decidido

Alcance (ticket_scope): whole_ticket. Repo: /Users/edobacon/Workspace/taomangalam. Base 0195455 (commit previo al primer commit del ticket), head 287c8ea.

## Pedido
[HU-02-15] Tope de cache por tipo de dispositivo con reserva minima y LRU que nunca borra assets esenciales (DEC-202). La cache de assets descargables respeta un tope por clase de dispositivo y una reserva minima de espacio libre, libera por LRU solo archivos recuperables y verificados, nunca borra assets esenciales ni medios de la persona, y avisa en vez de borrar cuando no hay candidatos seguros. Consumidores: HU-02-09 (gestor de descarga y cache) y, en M2, la accion Liberar de este dispositivo (EP-09, fuera de alcance).

Incluye: tope blando 1 GB telefono y 2 GB tablet, reserva minima 1 GB libre; reduccion opcional desde el backend con claves de `otras` en obtenerConfiguracionPublica (un valor mayor al de DEC-202 se ignora); clase de dispositivo por lado corto (umbral documentado en tecnologia/10); al superar tope o reserva, borrado LRU de derivados descargados verificados por SHA-256; nunca se borran empaquetados, hash no verificado ni adjuntos de la persona (solo_local, pendiente, subiendo); sin candidatos seguros la descarga nueva no se hace, la vista usa la superficie de respaldo y se registra el bloqueo sin borrar datos; telemetria agregada de tamanos y resultados, sin nombres ni contenido.
No incluye: accion Liberar de este dispositivo y respaldo de medios (EP-09); descarga y verificacion (HU-02-09).

Criterios: telefono con cache en 1 GB al descargar uno nuevo borra primero el verificado mas antiguo y queda bajo el tope; tablet tope 2 GB salvo reduccion; menos de 1 GB libre libera por LRU hasta recuperar la reserva o, si no alcanza, no se descarga; config publica 500 MB se usa, 3 GB se ignora y rige DEC-202; hash no verificado o adjunto sin respaldar nunca se borra; sin candidatos seguros la vista muestra la superficie de respaldo y no se borra nada; cache vaciada por el SO con red se re-descarga y verifica sin error; metricas solo tamanos y resultados agregados. Rollback: desactivar la politica de expulsion y volver al comportamiento anterior sin borrar esenciales ni datos de la persona.

## Decidido (adendas)
- Clase de dispositivo: TaoBreakpoint.mediumMin = 600; lado corto logico menor a 600 es telefono, 600 o mas tablet.
- Config publica: claves cacheTopeMb y cacheReservaMb (MB enteros) dentro de `otras`; ambas solo pueden REDUCIR el limite; ausente, no numerico, no entero, <=0 o mayor al limite se ignora y rige DEC-202.
- Lectura del espacio libre: dependencia nueva detras de interfaz inyectable (candidato inicial disk_space_plus; el dev decidio adoptar disk_space_2 porque disk_space_plus obliga a CocoaPods en un proyecto iOS que usa solo SwiftPM). Decision tecnica registrada.
- Adjuntos de la persona excluidos por PERTENENCIA (no estan en el indice ni en su directorio), no por nombre ni estado.
- Si los candidatos seguros no alcanzan para cumplir tope o reserva, no se borra ninguno (sin borrado parcial) y la descarga no se hace. Matiz aceptado: un fallo del evictor a mitad de borrado deja lo ya liberado y bloquea.
- Observabilidad: ubicar el canal existente; si no hay adecuado, interfaz inyectable con solo tamanos y resultados (se uso interfaz inyectable porque DownloadMetrics solo cuenta descargas).
- Superficie de respaldo: componente existente; sin componente nuevo; prueba de mapeo en la vista.
- Indice de cache de HU-02-09: campos aditivos ultimoAcceso y verificado; ultimoAcceso se actualiza en cada lectura servida; sin verificado nunca candidata; sin ultimoAcceso se ordena como la mas reciente.
- Ruta de prueba: app/test/core/assets/cache/cache_policy_integration_test.dart.
- Verificacion humana en dispositivos (telefono y tablet con almacenamiento bajo) diferida por decision del dev (humanChecks=defer). No es defecto.
- Entorno: 9 fallas preexistentes en app/test/core/http/app_release_test.dart (entorno).
