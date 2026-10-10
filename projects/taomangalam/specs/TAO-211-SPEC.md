---
id: TAO-211-SPEC
project: taomangalam
ticket: TAO-211
status: approved
---

# HU-02-15 Política de caché de assets descargables: tope por clase de dispositivo, reserva mínima y LRU seguro (DEC-202)

## Resumen ejecutivo

Se agrega una política de caché para los derivados `descargable` del manifiesto. Calcula el tope según la clase de dispositivo (1 GB en teléfono, 2 GB en tablet), mantiene una reserva mínima de 1 GB libre y deja que el backend reduzca esos límites con una clave de `otras` en obtenerConfiguracionPublica. Un valor mayor al tope de DEC-202 se ignora. Al superar el tope o la reserva, borra por LRU solo derivados verificados por SHA-256. Si no hay candidatos seguros, bloquea la descarga, muestra la superficie de respaldo y registra telemetría agregada sin nombres de archivo.
NO incluye: la acción `Liberar de este dispositivo` ni el respaldo de medios (EP-09, M2), la descarga y verificación (HU-02-09), endpoints nuevos ni interfaz propia.
Se sabe que funciona porque los tests unitarios cubren la selección LRU, los candidatos seguros, el tope por clase y la reducción desde la configuración. La integración con almacenamiento simulado reproduce QA-02-15-01/02/03 y la caché vaciada por el sistema operativo. Una aserción comprueba que nunca se borra un asset empaquetado, uno sin verificar o un adjunto de la persona.
Tamaño: 3 puntos en 2 sesiones (T2 y T2), dentro del techo de 4.
ADVERTENCIA: depende de HU-02-09 (bloqueante). Si su gestor de descarga y caché no está integrado en origin/main, la sesión 2 no puede ejecutarse.
Datos a confirmar antes de ejecutar:
- Ruta y API del gestor de descarga y caché de HU-02-09 en app/lib (no figura en el contexto). Confirmarlo en origin/main de taomangalam.
- Nombre exacto de la clave de `otras` en obtenerConfiguracionPublica para reducir el tope y la reserva, y su unidad (bytes o MB). Está en docs/backlog/EP-02_contenido_empaquetado_y_assets.md:2167-2189 y en el contrato OpenAPI de server.
- Umbral del lado corto de pantalla que separa teléfono y tablet: lo fija el refinamiento técnico y se documenta en tecnologia/10.
- Mecanismo para leer el espacio libre del dispositivo (plugin existente o uno nuevo). Una dependencia nueva requiere aprobación.
- Si el índice de caché de HU-02-09 ya guarda la fecha del último acceso y el estado de verificación SHA-256, o hay que agregarlos.
- Cómo se identifica un adjunto `solo_local`/`pendiente`/`subiendo` (HU-08-13) y dónde vive, para excluirlo de los candidatos.
- Componente de la superficie de respaldo que ya usa la vista ante un asset ausente.

## Requirements

### REQ-01 `confirmed`
> Fuente: Adenda 3 (a) y (e); Adenda 1 punto 1; DEC-202

El tope blando de caché depende de la clase de dispositivo: 1 GB en teléfono y 2 GB en tablet. La clase se decide solo en una unidad (S1.T5) por el lado corto lógico de la pantalla, reutilizando TaoBreakpoint.mediumMin = 600 (app/lib/design_system/tokens/tokens.g.dart) con la misma convención de app/lib/core/images/image_family_resolver.dart: lado corto menor a 600 es teléfono; 600 o más (incluido exactamente 600) es tablet. No se define un número nuevo y el umbral se documenta en tecnologia/10 desde esa misma unidad. Además se exige una reserva mínima de 1 GB libre (DEC-202).

### REQ-02 `confirmed`
> Fuente: Adenda 2 y Adenda 4 (c) del ticket TAO-211

El backend solo puede REDUCIR el tope y la reserva de DEC-202 mediante las claves cacheTopeMb y cacheReservaMb dentro de `otras` en obtenerConfiguracionPublica, ambas en MB enteros. El límite de DEC-202 es 1 GB teléfono y 2 GB tablet para el tope, y 1 GB para la reserva. Un valor ausente, no numérico, no entero, menor o igual a cero, o mayor a su límite de DEC-202 se ignora y rige DEC-202. Esta redacción prevalece sobre el punto 2 de la adenda 1 (Adenda 2). Ejemplos: cacheReservaMb=500 da una reserva efectiva de 524288000 bytes; cacheReservaMb mayor a 1024 se ignora y rige DEC-202 (Adenda 4 (c)).

### REQ-03 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-02_contenido_empaquetado_y_assets.md:151

Solo son candidatos a borrado automático los derivados descargados en modo `descargable` con SHA-256 verificado. Nunca lo son los assets empaquetados, los archivos con hash no verificado ni los medios de la persona (adjuntos `solo_local`, `pendiente` o `subiendo`, HU-08-13).

### REQ-04 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-02_contenido_empaquetado_y_assets.md:175

Antes de una descarga, si con el tamaño nuevo se supera el tope o la reserva, se borran candidatos seguros por LRU (primero el de último acceso más antiguo) hasta volver a cumplir ambos límites. Si no alcanza o no hay candidatos, la descarga no se hace, la vista usa la superficie de respaldo y no se borra ningún dato.

### REQ-05 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-02_contenido_empaquetado_y_assets.md:201

Si el sistema operativo vació la caché y la vista pide un asset con red, se vuelve a descargar y verificar sin error. Sin red, el asset borrado por LRU o por el sistema se muestra con la superficie de respaldo.

### REQ-06 `confirmed`
> Fuente: Request: Telemetría agregada de tamaños y resultados, sin nombres ni contenido de archivos; Adenda 1 punto 5

Cada liberación y cada bloqueo registra telemetría agregada que contiene únicamente tamaños y resultados (bytes liberados, cantidad de archivos, resultado liberado o bloqueado), sin clase de dispositivo, nombres, rutas, ids ni contenido de archivos.

### REQ-07 `inferred` `enforcement`
> Fuente: taomangalam/docs/backlog/EP-02_contenido_empaquetado_y_assets.md:1116

La política se integra en el gestor de descarga y caché existente de HU-02-09, sin duplicar su descarga ni su verificación SHA-256, y se puede desactivar como rollback para volver al comportamiento previo sin borrar assets esenciales ni datos de la persona.

### REQ-08 `confirmed` `enforcement`
> Fuente: taomangalam/app/lib/features/cuenta/data/servicio_cerrar_sesion.dart:82

Los tests y fixtures siguen los patrones de app/test (almacén en memoria inyectado, constantes compartidas sin literales repetidos), y el código nuevo sigue el estilo de errores tipados del cliente (FallaDeRed/FallaDelServidor).

### REQ-09 `confirmed`
> Fuente: Adenda 1 punto 3; Adenda 3 (f)

La lectura del espacio libre del dispositivo se hace con una dependencia nueva (candidato disk_space_plus) porque device_info_plus y path_provider, ya presentes en app/pubspec.yaml, no lo entregan. Antes de adoptarla se verifica mantenimiento, licencia y soporte de iOS y Android. La dependencia se registra como decisión técnica en el ticket y se usa solo detrás de una interfaz inyectable que las pruebas reemplazan por una simulación. Si la lectura del espacio libre falla, el resultado de la política es bloqueado y no se borra ningún dato.

### REQ-10 `confirmed`
> Fuente: Adenda 1 punto 4

Los adjuntos de la persona (solo_local, pendiente, subiendo, HU-08-13) quedan fuera del conjunto de candidatos del índice de caché de HU-02-09: el ticket ubica explícitamente dónde viven respecto de ese índice y los excluye por pertenencia (no están en el índice ni en su directorio), no por nombre ni por extensión.

### REQ-11 `confirmed`
> Fuente: Adenda 1 punto 5; Request: Observabilidad

La telemetría de liberaciones y bloqueos usa el canal de observabilidad existente de la app, que se ubica como primer paso de la tarea S2.T4. Si no existe un canal adecuado, se registran solo tamaños y resultados agregados detrás de una interfaz inyectable. En ambos casos el evento contiene únicamente tamaños y resultados, sin clase de dispositivo, nombres, rutas, ids ni contenido de archivos.

### REQ-12 `confirmed` `enforcement`
> Fuente: Adenda 1 punto 6; Adenda 3 (h)

El resultado bloqueado de la política (sin candidatos seguros o sin espacio suficiente) se mapea en la vista al componente existente de superficie de respaldo, que se confirma en el código antes de usarlo, y hay una prueba del mapeo en la vista. No se crea un componente nuevo. El ejecutor registra en el ticket la vista y el componente elegidos para la superficie de respaldo.

### REQ-13 `confirmed` `enforcement`
> Fuente: Adenda 1 punto 7

La prueba de integración de la política vive en app/test/core/assets/cache/cache_policy_integration_test.dart, archivo que crea este ticket y que se ejecuta desde app/. El archivo app/test/core/http/app_release_test.dart ya existe y sirve de referencia de ruta y patrón.

### REQ-14 `confirmed`
> Fuente: Adenda 4 (a)

El índice de caché de HU-02-09 lleva los campos ultimoAcceso y verificado, verificados o agregados de forma aditiva (los implementa S1.T9): un índice antiguo sin esos campos se lee sin error y los campos ausentes se ignoran. El gestor actualiza ultimoAcceso en cada lectura de un asset que sirve, de modo que un asset leído recientemente no es el primer candidato de la liberación por LRU. Regla de entradas incompletas: una entrada del índice sin el campo verificado nunca es candidata a borrado, y una entrada sin ultimoAcceso se ordena como la más reciente y no se borra primero. S1.T9 implementa estas reglas y S1.T10 las prueba.
## Tasks

#### S1.T1 — Solo verificación: confirmar que el gestor de descarga y caché y el índice de HU-02-09 (TAO-204) existen en la rama epic/EP-02 (merge 2987477). No modifica código.
Contrato: rollback: No aplica: la tarea es solo de verificación y no hay cambios que revertir.. Status: done

#### S1.T2 — Constantes de DEC-202 (tope blando 1 GB teléfono y 2 GB tablet; reserva mínima 1 GB libre) y fallback ante FallaDeRed y FallaDelServidor al leer la configuración pública, de modo que rija DEC-202. Esta task conserva solo eso: no define la clase de dispositivo (vive en S1.T5) ni la reducción desde la configuración (vive en S1.T6). Valida REQ-08.
Contrato: rollback: Revertir el commit. Es un módulo nuevo sin consumidores todavía.. Status: done

#### S1.T3 — Implementar la selección LRU de candidatos seguros operando solo sobre las entradas del índice de caché de HU-02-09 (derivados descargables con SHA-256 verificado, el de último acceso más antiguo primero). La exclusión de adjuntos de la persona se delega a la pertenencia definida en S1.T8, no a un filtro por estado ni por nombre.
Contrato: rollback: Revertir el commit. Es un módulo nuevo sin consumidores.. Status: done

#### S1.T4 — En la política de liberación, si falla la lectura del espacio libre del dispositivo (interfaz inyectable de REQ-09), el resultado es bloqueado y no se borra ningún dato. Agregar la prueba que simula la falla de lectura y verifica el resultado bloqueado y que ningún archivo del índice se borra.
Contrato: rollback: Borrar los archivos de test nuevos.. Status: done

#### S1.T5 — Resolver la clase de dispositivo (única unidad que la define) reutilizando TaoBreakpoint.mediumMin = 600 (app/lib/design_system/tokens/tokens.g.dart) con la convención de app/lib/core/images/image_family_resolver.dart: lado corto lógico menor a 600 es teléfono; 600 o más es tablet. No se define un número nuevo. Documentar el umbral en tecnologia/10. Incluir test boundary: 600 es tablet y 599 es teléfono.
Contrato: rollback: Revertir el commit de la clase de dispositivo y de la nota en tecnologia/10; el resto de la política no depende de ella hasta integrarse.. Status: done

#### S1.T6 — Aplicar la reducción desde la configuración pública (única unidad que la implementa) leyendo cacheTopeMb y cacheReservaMb dentro de `otras` de obtenerConfiguracionPublica, enteros en MB. Solo pueden reducir el límite de DEC-202; un valor ausente, no numérico, no entero, menor o igual a cero, o mayor a su límite (tope 1 GB teléfono y 2 GB tablet; reserva 1 GB) se ignora y rige DEC-202.
Contrato: rollback: Revertir el commit del resolvedor de límites; los límites vuelven a ser las constantes de DEC-202.. Status: done

#### S1.T7 — Verificar la dependencia para leer el espacio libre (candidato disk_space_plus): mantenimiento, licencia y soporte de iOS y Android. Si es adecuada, agregarla a app/pubspec.yaml y registrar la decisión técnica en el ticket; si no, proponer alternativa antes de adoptar. Definir una interfaz (p. ej. FreeSpaceReader) con implementación real que envuelve el plugin y una simulada para pruebas; ningún otro archivo importa el plugin.
Contrato: rollback: Quitar la dependencia de app/pubspec.yaml y la implementación real, dejando solo la interfaz; revertir el registro de la decisión.. Status: done

#### S1.T8 — Ubicar y documentar en el ticket dónde viven los adjuntos de la persona (solo_local, pendiente, subiendo, HU-08-13) respecto del índice de caché y del directorio de HU-02-09, y excluirlos por pertenencia (no están en el índice ni en su directorio), no por nombre, extensión ni estado. S1.T3 delega en esta pertenencia.
Contrato: rollback: Revertir el filtro de pertenencia y la exclusión de adjuntos de la persona del conjunto de candidatos. No menciona el flag de desactivación, que se crea en S2.T1.. Status: done

#### S1.T9 — Verificar o agregar de forma aditiva los campos ultimoAcceso y verificado en el índice de caché de HU-02-09 (un índice antiguo sin esos campos se lee sin error) y actualizar ultimoAcceso en cada lectura de un asset servida por el gestor. Regla: una entrada sin el campo verificado nunca es candidata a borrado; una entrada sin ultimoAcceso se ordena como la más reciente y no se borra primero. Este es el modelo de datos de ultimoAcceso y verificado (no S1.T1).
Contrato: rollback: Quitar la actualización de ultimoAcceso y los campos aditivos ultimoAcceso y verificado, que se ignoran al leer; no se pierden datos del índice.. Status: done

#### S1.T10 — Crear app/test/core/assets/cache/cache_index_access_test.dart con la prueba de regresión del LRU: un asset leído recientemente no es el primer candidato de la liberación por LRU. Cubrir además la regla de entradas incompletas: una entrada sin verificado nunca es candidata, y una entrada sin ultimoAcceso se ordena como la más reciente y no se borra primero. Este archivo lo crea S1.T10; app/test/core/assets/cache/cache_policy_integration_test.dart lo crea S2.T3, no esta task.
Contrato: rollback: Eliminar el archivo o los casos de prueba agregados; no afecta código de producción.. Status: done

#### S2.T1 — Integrar la política en el gestor de HU-02-09 antes de cada descarga. Pedir el plan y borrar los candidatos del plan; si el plan es `bloqueado`, no descargar ni borrar nada y devolver el resultado que la vista mapea a su superficie de respaldo existente. Si un archivo indexado falta (caché vaciada por el sistema), re-descargar y verificar con la verificación SHA-256 existente, y sin red devolver la superficie de respaldo. Exponer un interruptor para desactivar la política como rollback.
Contrato: rollback: Desactivar la política con el interruptor, o revertir el commit. El gestor vuelve a descargar sin borrar nada y no se tocan assets esenciales ni datos de la persona.. Status: done

#### S2.T3 — Prueba de integración de la política de caché en app/test/core/assets/cache/cache_policy_integration_test.dart (archivo que crea este ticket; se ejecuta desde app/; app/test/core/http/app_release_test.dart ya existe y sirve de referencia de ruta y patrón). Usa almacenamiento simulado bajo (interfaz inyectable de espacio libre) y almacén en memoria inyectado, con constantes compartidas sin literales repetidos. Casos: (1) QA-02-15-01: con tope reducido a 50 MB mediante cacheTopeMb, al descargar assets hasta superarlo se borran por LRU los menos usados y nunca los empaquetados; (2) QA-02-15-02: dispositivo casi lleno con solo adjuntos de la persona sin respaldar (solo_local, pendiente, subiendo), al pedir una descarga no se borra ningún dato y el resultado bloqueado se mapea a la superficie de respaldo; (3) QA-02-15-03: configuración pública con cacheTopeMb mayor al permitido se ignora y rige el tope de DEC-202; (4) caché vaciada por el sistema operativo: con red, la vista pide el asset y se vuelve a descargar y verificar SHA-256 sin error. Valida REQ-04, REQ-05, REQ-10 y REQ-13.
Contrato: rollback: Borrar los archivos de test nuevos.. Status: done

#### S2.T4 — Registrar la telemetría de liberaciones y bloqueos. Primer paso dentro de esta tarea: ubicar el canal de observabilidad existente de la app y usarlo; si no hay uno adecuado, registrar solo tamaños y resultados agregados detrás de una interfaz inyectable. El evento contiene únicamente tamaños y resultados (bytes liberados, cantidad de archivos, resultado liberado o bloqueado), sin clase de dispositivo, nombres, rutas, ids ni contenido de archivos. La prueba exige que el evento contenga únicamente tamaños y resultados y falla si aparece cualquier otro campo.
Contrato: rollback: Revertir el commit del emisor de telemetría; la política sigue funcionando sin registrar métricas.. Status: done

#### S2.T5 — Confirmar en el código el componente existente de superficie de respaldo y mapear a él el resultado bloqueado de la política en la vista. Agregar prueba de widget del mapeo (bloqueado muestra la superficie de respaldo; descarga exitosa no).
Contrato: rollback: Revertir el commit del mapeo en la vista; la vista vuelve a su comportamiento previo.. Status: done
## Verificacion runtime

1. **Qué:** Verificar en runtime: El tope blando de caché depende de la clase de dispositivo: 1 GB en teléfono y 2 GB en tablet. La clase se decide por el lado corto de la pantalla con el umbral documentado en tecnologia/10. Además se exige una reserva mínima de 1 GB libre (DEC-202).
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket

## Cambios al modelo de datos

- tipo: alter_additive | objetos: indice de cache local HU-02-09.ultimoAcceso, indice de cache local HU-02-09.verificado | destructivo: no | tarea: S1.T1 | rollback: Ignorar los campos nuevos (lectura tolerante). Las entradas sin ultimoAcceso se tratan como las más recientes y no se borran. No se reescriben datos existentes.

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-01 (edit) `confirmed`: El tope blando de caché depende de la clase de dispositivo: 1 GB en teléfono y 2 GB en tablet. La clase se decide por el lado corto lógico d
- REQ-02 (edit) `confirmed`: El backend solo puede REDUCIR el tope y la reserva de DEC-202 mediante las claves cacheTopeMb y cacheReservaMb dentro de `otras` en obtenerC
- REQ-09 (add) `confirmed`: La lectura del espacio libre del dispositivo se hace con una dependencia nueva (candidato disk_space_plus) porque device_info_plus y path_pr
- REQ-10 (add) `confirmed`: Los adjuntos de la persona (solo_local, pendiente, subiendo, HU-08-13) quedan fuera del conjunto de candidatos del índice de caché de HU-02-
- REQ-11 (add) `confirmed`: La telemetría de liberaciones y bloqueos usa el canal de observabilidad existente de la app, ubicado antes de la sesión 2. Si no existe un c
- REQ-12 (add) `confirmed`: El resultado bloqueado de la política (sin candidatos seguros o sin espacio suficiente) se mapea en la vista al componente existente de supe
- REQ-13 (add) `confirmed`: La prueba de integración de la política vive en app/test/core/assets/cache/cache_policy_integration_test.dart, archivo que crea este ticket 

**Tasks agregadas:**

- S1: Implementar la clase de dispositivo con TaoBreakpoint.mediumMin = 600 (app/lib/design_system/tokens/tokens.g.dart), con la convención de app/lib/core/images/image_family_resolver.dart: lado corto lógico < 600 es teléfono; >= 600 es tablet. Sin número nuevo. Documentar el umbral en tecnologia/10. Cubrir con pruebas unitarias los bordes 599 y 600. (valida: REQ-01; rollback: Revertir el commit de la clase de dispositivo y de la nota en tecnologia/10; el resto de la política no depende de ella hasta integrarse.)
- S1: Implementar la resolución de límites efectivos leyendo cacheTopeMb y cacheReservaMb dentro de `otras` de obtenerConfiguracionPublica (MB enteros). Solo reducen: ausente, no numérico, no entero, <= 0 o mayor al límite de DEC-202 (tope 1 GB teléfono / 2 GB tablet; reserva 1 GB) se ignora y rige DEC-202. Pruebas unitarias con 500, 1024, 1025, 3072, 0, -5, 1.5, 'abc', null y ausente. (valida: REQ-02; rollback: Revertir el commit del resolvedor de límites; los límites vuelven a ser las constantes de DEC-202.)
- S1: Verificar la dependencia para leer el espacio libre (candidato disk_space_plus): mantenimiento, licencia y soporte de iOS y Android. Si es adecuada, agregarla a app/pubspec.yaml y registrar la decisión técnica en el ticket; si no, proponer alternativa antes de adoptar. Definir una interfaz (p. ej. FreeSpaceReader) con implementación real que envuelve el plugin y una simulada para pruebas; ningún otro archivo importa el plugin. (valida: REQ-09; rollback: Quitar la dependencia de app/pubspec.yaml y la implementación real, dejando solo la interfaz; revertir el registro de la decisión.)
- S1: Ubicar dónde viven los adjuntos de la persona (solo_local, pendiente, subiendo, HU-08-13) respecto del índice de caché de HU-02-09 y dejarlo documentado en el ticket. Construir el conjunto de candidatos excluyéndolos por pertenencia al índice (no por nombre ni extensión), más empaquetados y hash no verificado. Pruebas con un adjunto de nombre idéntico a un derivado. (valida: REQ-10, REQ-03; rollback: Revertir el commit del filtro de candidatos; sin él la expulsión queda desactivada por el flag de rollback.)
- S2: Antes de implementar la telemetría, ubicar el canal de observabilidad existente de la app y registrar en el ticket cuál es. Usarlo para emitir bytes liberados, cantidad de archivos, resultado (liberado/bloqueado) y clase de dispositivo, sin nombres, rutas, ids ni contenido. Si no existe un canal adecuado, registrar solo tamaños y resultados agregados detrás de una interfaz inyectable. Prueba que el evento no contiene campos identificables. (valida: REQ-11, REQ-06; rollback: Revertir el commit del emisor de telemetría; la política sigue funcionando sin registrar métricas.)
- S2: Confirmar en el código el componente existente de superficie de respaldo y mapear a él el resultado bloqueado de la política en la vista. Agregar prueba de widget del mapeo (bloqueado muestra la superficie de respaldo; descarga exitosa no). (valida: REQ-12, REQ-04; rollback: Revertir el commit del mapeo en la vista; la vista vuelve a su comportamiento previo.)
- S2: Crear app/test/core/assets/cache/cache_policy_integration_test.dart (se ejecuta desde app/; app_release_test.dart en app/test/core/http/ es la referencia de patrón) con almacenamiento simulado bajo mediante la interfaz de espacio libre, caché vaciada por el sistema, adjuntos sin respaldar y tope reducido a 50 MB. Reutilizar constantes compartidas y almacén en memoria inyectado, sin literales repetidos. (valida: REQ-13, REQ-05, REQ-08, test; rollback: Eliminar el archivo de prueba de integración; no afecta código de producción.)

### Enmienda 2
**REQs:**

- REQ-01 (edit) `confirmed`: El tope blando de caché depende de la clase de dispositivo: 1 GB en teléfono y 2 GB en tablet. La clase se decide solo en una unidad (S1.T5)
- REQ-09 (edit) `confirmed`: La lectura del espacio libre del dispositivo se hace con una dependencia nueva (candidato disk_space_plus) porque device_info_plus y path_pr
- REQ-12 (edit) `confirmed`: El resultado bloqueado de la política (sin candidatos seguros o sin espacio suficiente) se mapea en la vista al componente existente de supe

**Task ops:**

- edit S1.T2 { desc="Definir solo las constantes de DEC-202 (tope 1 GB teléfono y 2 GB tablet, reserva mínima 1 GB libre) y el fallback ante FallaDeRed y FallaDelServidor al leer la configuración pública, rigiendo DEC-202. No incluye la clase de dispositivo ni la nota en tecnologia/10 (viven solo en S1.T5) ni la reducción desde configuración (vive solo en S1.T6)." }
- edit S1.T3 { desc="Implementar la selección LRU de candidatos seguros operando solo sobre las entradas del índice de caché de HU-02-09 (derivados descargables con SHA-256 verificado, el de último acceso más antiguo primero). La exclusión de adjuntos de la persona se delega a la pertenencia definida en S1.T8, no a un filtro por estado ni por nombre." }
- edit S1.T5 { desc="Resolver la clase de dispositivo (única unidad que la define) reutilizando TaoBreakpoint.mediumMin = 600 (app/lib/design_system/tokens/tokens.g.dart) con la convención de app/lib/core/images/image_family_resolver.dart: lado corto lógico menor a 600 es teléfono; 600 o más es tablet. No se define un número nuevo. Documentar el umbral en tecnologia/10. Incluir test boundary: 600 es tablet y 599 es teléfono." }
- edit S1.T6 { desc="Aplicar la reducción desde la configuración pública (única unidad que la implementa) leyendo cacheTopeMb y cacheReservaMb dentro de `otras` de obtenerConfiguracionPublica, enteros en MB. Solo pueden reducir el límite de DEC-202; un valor ausente, no numérico, no entero, menor o igual a cero, o mayor a su límite (tope 1 GB teléfono y 2 GB tablet; reserva 1 GB) se ignora y rige DEC-202." }
- edit S1.T8 { desc="Ubicar y documentar en el ticket dónde viven los adjuntos de la persona (solo_local, pendiente, subiendo, HU-08-13) respecto del índice de caché y del directorio de HU-02-09, y excluirlos por pertenencia (no están en el índice ni en su directorio), no por nombre, extensión ni estado. S1.T3 delega en esta pertenencia." }
- edit S2.T4 { desc="Conserva su alcance actual y absorbe el de S2.T2: ambos se ejecutan como una sola task. No cita líneas concretas de archivos en los test cases." }
- delete S2.T2
- edit S2.T3 { desc="Conserva su alcance actual y absorbe el de S2.T6: ambos se ejecutan como una sola task. El ejecutor registra en el ticket la vista y el componente elegidos para la superficie de respaldo. No cita líneas concretas de archivos en los test cases." }
- delete S2.T6

### Enmienda 3

**Task ops:**

- edit S2.T3 { desc="Prueba de integración de la política de caché en app/test/core/assets/cache/cache_policy_integration_test.dart (archivo que crea este ticket; se ejecuta desde app/; app/test/core/http/app_release_test.dart ya existe y sirve de referencia de ruta y patrón). Usa almacenamiento simulado bajo (interfaz inyectable de espacio libre) y almacén en memoria inyectado, con constantes compartidas sin literales repetidos. Casos: (1) QA-02-15-01: con tope reducido a 50 MB mediante cacheTopeMb, al descargar assets hasta superarlo se borran por LRU los menos usados y nunca los empaquetados; (2) QA-02-15-02: dispositivo casi lleno con solo adjuntos de la persona sin respaldar (solo_local, pendiente, subiendo), al pedir una descarga no se borra ningún dato y el resultado bloqueado se mapea a la superficie de respaldo; (3) QA-02-15-03: configuración pública con cacheTopeMb mayor al permitido se ignora y rige el tope de DEC-202; (4) caché vaciada por el sistema operativo: con red, la vista pide el asset y se vuelve a descargar y verificar SHA-256 sin error. Valida REQ-04, REQ-05, REQ-10 y REQ-13.", validates=["REQ-04","REQ-05","REQ-10","REQ-13"], isTest=true, verify=["cd app && flutter test test/core/assets/cache/cache_policy_integration_test.dart"] }
- edit S2.T4 { desc="Telemetría de la liberación. Antes de la sesión 2, ubicar el canal de observabilidad existente de la app y registrarlo en el ticket. Emitir por ese canal, en cada liberación y cada bloqueo, solo: bytes liberados, cantidad de archivos, resultado (liberado o bloqueado) y clase de dispositivo (teléfono o tablet); sin nombres, rutas, ids, hashes ni contenido de archivos. Si no existe un canal adecuado, usar una interfaz inyectable de respaldo que registre solo tamaños y resultados agregados. Incluir pruebas que verifiquen que el evento emitido contiene únicamente esos campos. Valida REQ-06 y REQ-11.", validates=["REQ-06","REQ-11"] }
- edit S1.T2 { desc="Constantes de DEC-202 (tope blando 1 GB teléfono y 2 GB tablet; reserva mínima 1 GB libre) y fallback ante FallaDeRed y FallaDelServidor al leer la configuración pública, de modo que rija DEC-202. Esta task conserva solo eso: no define la clase de dispositivo (vive en S1.T5) ni la reducción desde la configuración (vive en S1.T6). Valida REQ-08.", validates=["REQ-08"] }
- edit S1.T1 { desc="Antes de la sesión 1, verificar que el gestor de descarga y el índice de caché de HU-02-09 (TAO-204) están presentes en la rama de la épica epic/EP-02 (merge 2987477), no en origin/main. Si no están, detenerse y reportar antes de continuar." }

### Enmienda 4
**REQs:**

- REQ-14 (add) `confirmed`: El índice de caché de HU-02-09 lleva los campos ultimoAcceso y verificado, verificados o agregados de forma aditiva: un índice antiguo sin e
- REQ-02 (edit) `confirmed`: El backend solo puede REDUCIR el tope y la reserva de DEC-202 mediante las claves cacheTopeMb y cacheReservaMb dentro de `otras` en obtenerC

**Tasks agregadas:**

- S1: Verificar o agregar de forma aditiva los campos ultimoAcceso y verificado en el índice de caché de HU-02-09 (los campos nuevos se ignoran al leer índices antiguos que no los tienen) y actualizar ultimoAcceso en cada lectura de un asset servida por el gestor, sin duplicar su descarga ni su verificación SHA-256. (valida: REQ-04, REQ-14; rollback: Quitar la actualización de ultimoAcceso y los campos aditivos ultimoAcceso y verificado, que se ignoran al leer; no se pierden datos del índice.)
- S1: Prueba de regresión: un asset leído recientemente por el gestor no es el primer candidato de la liberación por LRU; además, un índice antiguo sin ultimoAcceso ni verificado se lee sin error. Usa el almacén en memoria inyectado y constantes compartidas, según los patrones de app/test. (valida: REQ-04, REQ-14, test; rollback: Eliminar el archivo o los casos de prueba agregados; no afecta código de producción.)

**Task ops:**

- edit S1.T1 { desc="Solo verificación: confirmar que el gestor de descarga y caché y el índice de HU-02-09 (TAO-204) existen en la rama epic/EP-02 (merge 2987477). No modifica código.", rollback="No aplica: la tarea es solo de verificación y no hay cambios que revertir.", verify=[] }

### Enmienda 5
**REQs:**

- REQ-14 (edit) `confirmed`: El índice de caché de HU-02-09 lleva los campos ultimoAcceso y verificado, verificados o agregados de forma aditiva (los implementa S1.T9): 

**Task ops:**

- edit S1.T9 { desc="Verificar o agregar de forma aditiva los campos ultimoAcceso y verificado en el índice de caché de HU-02-09 (un índice antiguo sin esos campos se lee sin error) y actualizar ultimoAcceso en cada lectura de un asset servida por el gestor. Regla: una entrada sin el campo verificado nunca es candidata a borrado; una entrada sin ultimoAcceso se ordena como la más reciente y no se borra primero. Este es el modelo de datos de ultimoAcceso y verificado (no S1.T1)." }
- edit S1.T10 { desc="Crear app/test/core/assets/cache/cache_index_access_test.dart con la prueba de regresión del LRU: un asset leído recientemente no es el primer candidato de la liberación por LRU. Cubrir además la regla de entradas incompletas: una entrada sin verificado nunca es candidata, y una entrada sin ultimoAcceso se ordena como la más reciente y no se borra primero. Este archivo lo crea S1.T10; app/test/core/assets/cache/cache_policy_integration_test.dart lo crea S2.T3, no esta task.", validates=["REQ-14"], isTest=true, verify=["cd app && flutter test test/core/assets/cache/cache_index_access_test.dart"] }
- edit S1.T8 { rollback="Revertir el filtro de pertenencia y la exclusión de adjuntos de la persona del conjunto de candidatos. No menciona el flag de desactivación, que se crea en S2.T1." }

### Enmienda 6
**REQs:**

- REQ-06 (edit) `confirmed`: Cada liberación y cada bloqueo registra telemetría agregada que contiene únicamente tamaños y resultados (bytes liberados, cantidad de archi
- REQ-11 (edit) `confirmed`: La telemetría de liberaciones y bloqueos usa el canal de observabilidad existente de la app, que se ubica como primer paso de la tarea S2.T4
- REQ-14 (edit) `confirmed`: El índice de caché de HU-02-09 lleva los campos ultimoAcceso y verificado, verificados o agregados de forma aditiva (los implementa S1.T9): 

**Task ops:**

- edit S2.T4 { desc="Registrar la telemetría de liberaciones y bloqueos. Primer paso dentro de esta tarea: ubicar el canal de observabilidad existente de la app y usarlo; si no hay uno adecuado, registrar solo tamaños y resultados agregados detrás de una interfaz inyectable. El evento contiene únicamente tamaños y resultados (bytes liberados, cantidad de archivos, resultado liberado o bloqueado), sin clase de dispositivo, nombres, rutas, ids ni contenido de archivos. La prueba exige que el evento contenga únicamente tamaños y resultados y falla si aparece cualquier otro campo." }
- edit S1.T4 { desc="En la política de liberación, si falla la lectura del espacio libre del dispositivo (interfaz inyectable de REQ-09), el resultado es bloqueado y no se borra ningún dato. Agregar la prueba que simula la falla de lectura y verifica el resultado bloqueado y que ningún archivo del índice se borra.", validates=["REQ-09"] }
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4
- [x] S1.T5
- [x] S1.T6
- [x] S1.T7
- [x] S1.T8
- [x] S1.T9
- [x] S1.T10

**Gate (auto)**: Tests unitarios en verde que muestran: tope de 1 GB en teléfono y 2 GB en tablet, 500 MB aplicado y 3 GB ignorado, y LRU que solo devuelve derivados verificados, con una prueba explícita de que empaquetados, archivos sin verificar y adjuntos de la persona nunca se eligen.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T3
- [x] S2.T4
- [x] S2.T5

**Gate (auto)**: Tests de integración en verde con almacenamiento simulado: QA-02-15-01 (tope de 50 MB, se borran los menos usados y ningún empaquetado), QA-02-15-02 (no se borra nada y el resultado es la superficie de respaldo), QA-02-15-03 (3 GB ignorado), la caché vaciada por el sistema se re-descarga y verifica, y el registro de liberaciones solo contiene tamaños y resultados.

### Session 3 · T0 · continue

### Session 4 · T0 · open
