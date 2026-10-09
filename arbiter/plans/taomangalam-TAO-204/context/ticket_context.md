# Ticket TAO-204 (GH-77) - [HU-02-09] Descarga bajo demanda y cache local de assets no esenciales con verificacion por hash y uso sin conexion

work_type: implement · estado: ready_to_close · modulo: EP-02 · spec: TAO-204-SPEC approved

Alcance del juicio: ticket completo (rama feat/GH-77-hu-02-09-historia-descarga contra epic/EP-02, base 0c4c24ab; incluye cambios sin commitear del worktree).

## Pedido (request)

Resultado: la app descarga los assets descargables cuando una vista los necesita, verifica cada archivo por SHA-256, lo guarda en cache y lo muestra sin conexion una vez cacheado; si no hay cache ni red, la vista usa la superficie de respaldo. Consumidores: HU-01-02 (resolvedor), HU-07-07 a HU-07-09 y HU-02-15.

Incluye:
- Gestor de assets propio sobre flutter_cache_manager con manifiesto, huella, tamano.
- Lista de descargables y su SHA-256 segun el mecanismo decidido.
- Descarga desde el origen decidido, con URLs inmutables por hash.
- Verificacion por SHA-256 antes de exponer el archivo; un archivo alterado se descarta y se reintenta.
- Integracion con el resolvedor de HU-01-02: disponible, descargando o superficie de respaldo.
- Uso sin red de lo ya cacheado; sin cache ni red, superficie de respaldo sin error visible bloqueante.
- Metricas agregadas de descarga sin nombres de archivo por persona (DEC-202).

No incluye: tope de cache y LRU (HU-02-15); medios creados por la persona (EP-09); precarga en segundo plano de todo el catalogo.

Criterios de aceptacion:
1. Asset descargable no cacheado y con red: se descarga, se verifica su SHA-256 y se muestra.
2. Archivo servido con un byte alterado: se rechaza por hash, no se muestra y la vista usa la superficie de respaldo.
3. Asset ya cacheado en modo avion: se muestra desde la cache.
4. Asset nunca descargado y sin red: superficie de respaldo y la vista sigue funcionando.
5. Version nueva del asset en el manifiesto con red: se descarga la nueva y la anterior deja de usarse.
6. Descarga en curso y la vista se cierra: no deja archivos parciales expuestos.
7. Registro de metricas: solo conteos y tamanos agregados.

Requisitos transversales: verificacion por hash obligatoria; ninguna URL lleva datos de la persona; la superficie de respaldo mantiene el alt del asset; lo empaquetado nunca se descarga; errores de descarga agregados por tipo.

## Adendas al request (la mas nueva manda)

Adenda 1 (2026-10-09), decisiones del dev: (1) Origen (DEC-240): bucket privado de Railway con URL presignada de corta vida por clave inmutable derivados/<sha256>/<nombre>.webp. En este ticket la app depende de una interfaz de proveedor de URL de descarga y las pruebas usan una implementacion simulada; el endpoint real del servidor queda fuera de alcance. (2) Las huellas SHA-256 viajan en app/assets/manifest.json. (3) Reintento ante hash invalido: exactamente 1 (2 solicitudes en total), como constante con nombre; si el segundo intento falla se informa el error y no se cachea nada. (4) Integracion: resolvedor app/lib/core/images/image_family_resolver.dart (ResolvedImage sellado) e identity_assets.dart; no se cambia la firma publica de ImageFamilyResolver; el gestor se crea en app/lib/core/assets/. (5) La unica dependencia nueva permitida es flutter_cache_manager. (6) Lint de docs con markdownlint-cli2, cspell, vale y docs.mjs check:changed. (7) Rollback de codigo por tarea; sin interruptor de desactivacion. La QA humana en dispositivo queda en TAO-214. La reverificacion de hash al leer de la cache se mantiene.

Adenda 2 (2026-10-09): cada entrada de assets[] del manifiesto trae id, family, master, state, mode ('descargable' o 'empaquetado'), alt, platform, theme y derivatives[]; cada derivado trae path, width, height, bytes, sha256, variant, usage y colorSpace. (a) el cliente filtra por mode == 'descargable' y nunca solicita un empaquetado. (b) el alt lo aporta el resolvedor o identity_assets.dart sin copiarlo al gestor. (c) no existen version ni priority. (d) la clave pedida al proveedor de URL es derivados/<sha256>/<nombre>.webp (nombre = ultimo segmento de path). (e) la URL presignada la entrega el proveedor y es la unica que se usa. (f) la clave de cache es el sha256. (g) recorte de alcance: la reverificacion de hash al leer de cache vive solo en la sesion 1; la integracion con el resolvedor es una sola task; documentar y validar es una sola task por tema.

Adenda 3 (2026-10-09): hashMismatch cuenta pedidos que terminan sin archivo por hash invalido, una vez por pedido aunque haya reintento; un pedido con primer intento alterado y reintento correcto cuenta success y no suma hashMismatch. Ejemplo: 2 descargas correctas (100 y 50 bytes) y 1 pedido que agota el reintento dan success=2, bytes=150, hashMismatch=1. La relacion path a sha256 previo para eliminar la entrada anterior la persiste el gestor en el almacenamiento de la propia cache.

## REQs del spec (todos approved)

- REQ-01: vista pide asset descargable no cacheado y con red: el gestor obtiene URL presignada via DownloadUrlProvider para la clave derivados/<sha256>/<nombre>.webp, descarga, verifica SHA-256 contra el manifiesto, guarda en cache y entrega el archivo. Empaquetados nunca se descargan. Pruebas con implementacion simulada del proveedor.
- REQ-02: SHA-256 que no coincide se descarta antes de exponerse. kMaxHashRetries = 1 (2 solicitudes en total). Si el segundo intento tambien falla: error por tipo (hash invalido), respaldo y nada cacheado.
- REQ-03: cacheado y valido se sirve sin red. Nunca descargado y sin red: superficie de respaldo sin error visible bloqueante, la vista sigue funcionando. version y priority no existen; alt lo aporta el resolvedor o identity_assets.dart.
- REQ-04: clave por hash; sha256 nuevo en el manifiesto con red descarga la clave nueva y la entrada anterior deja de usarse y se elimina de la cache.
- REQ-05: si la vista se cierra o el pedido se cancela con descarga en curso, o el cuerpo llega truncado (tamano distinto de bytes del manifiesto), el temporal se borra y no queda parcial expuesto. Escritura a temporal y promocion a cache solo tras verificar SHA-256.
- REQ-06: el resolvedor recibe del gestor tres estados observables: disponible (con archivo), descargando o superficie de respaldo.
- REQ-07: metricas y errores solo como conteos y tamanos agregados por tipo (exito, hash invalido, sin red, cancelado), sin nombres de archivo, claves de asset ni URLs (DEC-202).
- REQ-08 (docs): uso del gestor, configuracion del origen y comportamiento sin conexion documentados en docs/development/configuration.md y scripts/assets/README.md, enlazando la DEC-240; sin tocar README raiz, CONTRIBUTING, commands.md ni release-runbook; pasan el linter de docs.
- REQ-09: flutter_cache_manager se agrega una sola vez (^x.y.z en pubspec.yaml y version exacta en pubspec.lock). El gestor se expone como provider Riverpod con @Riverpod(keepAlive: true). Los catch que se ignoran llevan comentario que explica por que.
- REQ-10: el gestor vive en app/lib/core/assets/ y se integra con image_family_resolver.dart (ResolvedImage sellado) e identity_assets.dart. No se cambia la firma publica de ImageFamilyResolver.
- REQ-11: unica dependencia nueva flutter_cache_manager (crypto, dio, path_provider ya estaban). No se implementa el endpoint real del servidor, ni interruptor de desactivacion, ni QA humana en dispositivo (TAO-214).
- REQ-12: el gestor reverifica el SHA-256 al leer de la cache; si no coincide se descarta y se trata como no cacheado (con red descarga, sin ella respaldo).
- REQ-13: la implementacion simulada de DownloadUrlProvider vive solo en app/test/core/assets/fake_download_url_provider.dart; en app/lib/core/assets/ solo la interfaz DownloadUrlProvider y la constante kMaxHashRetries.
- REQ-14: la integracion con el resolvedor se prueba contra el consumo real de ResolvedImage (EditorialIllustration o widget minimo). Casos: secuencia descargando y disponible; descargando y respaldo ante fallo de hash; cacheado y valido emite disponible directo; Semantics.label igual al alt con Text de relleno visible; sin excepciones sin red; desmontaje con descarga en curso sin setState tras dispose ni parciales y un pedido posterior completa la descarga desde cero.
- REQ-15 (docs): README.md, CONTRIBUTING.md, docs/development/commands.md y docs/development/release-runbook.md sin cambios. Nota: contra main CONTRIBUTING.md difiere por un commit previo de epic/EP-02 (1bcc90a); contra la base de la epica no hay diferencia.

## Sesiones y criterio de gate

- S1: analyze y test de app/lib/core/assets: archivo correcto se entrega y queda en cache, byte alterado se rechaza con exactamente 2 solicitudes, cancelar o truncar no deja parciales, sha256 nuevo reemplaza la entrada anterior, metricas solo agregadas.
- S2: el resolvedor expone los tres estados y los empaquetados se resuelven sin descarga; analyze y tests de core/images y core/assets en verde sin cambiar la firma publica de ImageFamilyResolver.
- S3: configuration.md y scripts/assets/README.md documentan origen, URLs inmutables, SHA-256 y uso sin conexion con enlace a la DEC-240; lint de docs en 0; sin cambios en los archivos de superficie raiz.

## Test cases esperados (REQ-01..REQ-15)

Ver REQs; cada uno con casos happy/error/edge/regression sobre servidor local, proveedor simulado y widgets (44 casos).

## Alcance de esta corrida

ticket_scope = whole_ticket. Cambios fuera del ticket (por ejemplo package.json o cualquier archivo fuera de app/lib/core/assets, app/lib/core/images, app/test/core, app/pubspec.*, docs/development/configuration.md, scripts/assets/README.md) son scope creep.

## Hechos del entorno (no son afirmaciones del ejecutor)

- app/assets/manifest.json no esta declarado en assets de app/pubspec.yaml; el endpoint real y el cableado del proveedor quedan fuera de alcance (adenda 1 punto 1), el widget TaoDownloadableImage aun no esta conectado a ninguna vista (HU posteriores).
- Los 9 tests de app/test/core/http/app_release_test.dart fallan por entorno (requieren PostgreSQL y un runner) y no estan en el diff.
