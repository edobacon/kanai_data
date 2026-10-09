---
id: TAO-204-SPEC
project: taomangalam
ticket: TAO-204
status: approved
---

# TAO-204 HU-02-09: descarga bajo demanda, verificación SHA-256 y caché local sin conexión de assets descargables

## Resumen ejecutivo

Qué se hace: un gestor de assets propio sobre flutter_cache_manager (DEC-173). Lee del manifiesto las entradas con modo descargable (huella SHA-256, versión, tamaño y prioridad) y descarga cada archivo cuando una vista lo pide, desde el origen y con las URLs inmutables que fija la DEC de HU-02-01 (DEC-240). Antes de exponer el archivo verifica su SHA-256 y lo escribe en la caché de forma atómica. Después lo sirve sin red y se integra con el resolvedor de HU-01-02 en tres estados: disponible, descargando y superficie de respaldo con alt. Registra métricas agregadas sin nombres de archivo (DEC-202).
Qué NO se hace: tope de caché ni LRU (HU-02-15), medios de la persona (EP-09), precarga en segundo plano del catálogo, endpoints nuevos ni cambios de servidor.
Cómo se sabe que funciona: tests contra un servidor HTTP local. Un archivo correcto se muestra. Un byte alterado se rechaza y deja la superficie de respaldo. Con la red cortada se sirve lo cacheado, y sin caché ni red queda la superficie de respaldo sin error bloqueante. Una versión nueva reemplaza a la anterior. Cancelar a mitad de la descarga no deja archivos parciales. Las métricas solo traen conteos y tamaños.
Tamaño: 5 puntos, 3 sesiones (T2, T2, T1), dentro del techo de 4.
ADVERTENCIAS: (1) La historia está bloqueada por HU-02-01 y HU-02-03; si la DEC-240 no fija el origen ni el mecanismo de huellas, no se puede ejecutar. (2) Los derivados descargables reales de HU-02-07 todavía faltan, así que los tests usan fixtures locales y la QA en dispositivo queda pendiente de esos assets. (3) El video de evidencia y la QA en teléfono y tablet son humanos y no se automatizan. (4) Queda fuera de alcance agregar el gestor al panel de desarrollo, aunque devPanelPendingEp02 en app_localizations.dart:275 lo anticipa.
Datos a confirmar antes de ejecutar: (a) DEC-240 (HU-02-01): URL base del origen, forma de la URL inmutable (por versión o por hash) y si las huellas viajan en el binario (app/assets/manifest.json) o en un endpoint; confirmar en docs/backlog/EP-02_contenido_empaquetado_y_assets.md y en la DEC. (b) Si las entradas descargables de app/assets/manifest.json:46 ya traen sha256, versión, tamaño y prioridad, o si hay que leerlos de otro artefacto (TAO-196, manifiesto v2). (c) La ruta real y la interfaz del resolvedor de HU-01-02 y del proveedor de assets de TAO-190 (ep01-assets-provider), para no duplicarlos. (d) El comando de lint de docs del repo (markdownlint, cspell y vale según el commit 91b5cc9); aquí se asumen pnpm exec markdownlint-cli2 y pnpm exec cspell, y hay que confirmarlo en package.json. (e) La versión exacta de flutter_cache_manager la resuelve `fvm flutter pub add`, que deja ^x.y.z en pubspec.yaml y la versión exacta en pubspec.lock.

## Requirements

### REQ-01 `confirmed`
> Fuente: Adenda 1 (1) y (2); DEC-240

Cuando una vista pide un asset descargable que no está cacheado y hay red, el gestor obtiene una URL presignada de corta vida a través de una interfaz de proveedor de URL de descarga (DownloadUrlProvider) para la clave inmutable derivados/<sha256>/<nombre>.webp (por hash, no por versión). Descarga el archivo, verifica su SHA-256 contra el declarado en app/assets/manifest.json (ruta, medidas, bytes y sha256 por derivado), lo guarda en la caché y entrega el archivo. Los assets empaquetados nunca se descargan. El endpoint real del servidor queda fuera de alcance: las pruebas usan una implementación simulada del proveedor.

### REQ-02 `confirmed`
> Fuente: Adenda 1 (3)

Un archivo cuyo SHA-256 no coincide con el del manifiesto se descarta antes de exponerse. El reintento ante hash inválido es exactamente 1, definido como una constante con nombre (kMaxHashRetries = 1), lo que da 2 solicitudes en total. Si el segundo intento también falla, se informa el error por tipo (hash inválido), la vista recibe el estado de superficie de respaldo y no se cachea nada.

### REQ-03 `confirmed`
> Fuente: Adenda 2 (b) y pedido de enmienda (7)

Un asset ya cacheado y con hash válido se sirve sin red. Un asset nunca descargado y sin red deja la superficie de respaldo, sin error visible bloqueante, y la vista sigue funcionando. version y priority no existen; alt existe en la entrada del asset y lo aporta el resolvedor o identity_assets.dart, no se copia al gestor.

### REQ-04 `confirmed`
> Fuente: Adenda 2 (c) y (f) y pedido de enmienda (7)

Como la clave es por hash, una versión nueva del asset se expresa en app/assets/manifest.json con un sha256 distinto. Cuando el manifiesto trae un sha256 nuevo para un derivado y hay red, el pedido descarga la clave derivados/<sha256 nuevo>/<nombre>.webp y la entrada anterior deja de usarse y se elimina de la caché. version y priority no existen; alt existe en la entrada del asset y lo aporta el resolvedor o identity_assets.dart, no se copia al gestor.

### REQ-05 `inferred`
> Fuente: Criterio de aceptación 6 del request y pedido de enmienda (2) y (3)

Si la vista se cierra o el pedido se cancela con una descarga en curso, o el cuerpo llega truncado (tamaño recibido distinto de bytes del manifiesto), el temporal se borra y no queda ningún archivo parcial expuesto. La escritura va a un archivo temporal y solo se promueve a la caché después de verificar el SHA-256.

### REQ-06 `inferred`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:322

El resolvedor de HU-01-02 recibe del gestor uno de tres estados observables para cada asset descargable: disponible (con el archivo), descargando o superficie de respaldo.

### REQ-07 `inferred`
> Fuente: taomangalam/docs/backlog/EP-02_contenido_empaquetado_y_assets.md:122

Las métricas de descarga y los errores se registran solo como conteos y tamaños agregados por tipo (éxito, hash inválido, sin red, cancelado), sin nombres de archivo, claves de asset ni URLs (DEC-202).

### REQ-08 `confirmed` `variant`
> Fuente: sonda:card-docs-de-superficie-6c8ae176a6

Variante docs: el uso del gestor, la configuración del origen de descarga y el comportamiento sin conexión quedan documentados en docs/development/configuration.md y en scripts/assets/README.md, enlazando la DEC-240. No se tocan README raíz, CONTRIBUTING, commands.md ni release-runbook, y los documentos tocados pasan el linter de docs.

### REQ-09 `confirmed` `enforcement`
> Fuente: taomangalam/app/lib/core/preferences/preference_controller.dart:37

Reuso y patrones: flutter_cache_manager se agrega una sola vez con `cd app && fvm flutter pub add flutter_cache_manager` (^x.y.z en pubspec.yaml y la versión exacta en pubspec.lock, sin probar otras versiones). El gestor se expone como provider Riverpod con @Riverpod(keepAlive: true), igual que AccessibilityPreferencesController. Los catch que se ignoran llevan un comentario que explica por qué, como _readApplied.

### REQ-10 `confirmed` `enforcement`
> Fuente: Adenda 1 (4)

Integración sin romper contratos: el gestor se crea en app/lib/core/assets/ y se integra con app/lib/core/images/image_family_resolver.dart (ResolvedImage sellado) y app/lib/core/images/identity_assets.dart. No se cambia la firma pública de ImageFamilyResolver. El ejecutor lee ambos archivos antes de tocarlos.

### REQ-11 `confirmed` `enforcement`
> Fuente: Adenda 1 (5), (1) y (7)

Límites de alcance: la única dependencia nueva permitida es flutter_cache_manager (crypto ^3.0.7, dio y path_provider ya están en app/pubspec.yaml). No se implementa el endpoint real del servidor, ni un interruptor de desactivación (el rollback es de código por tarea), ni QA humana en dispositivo (queda en TAO-214).

### REQ-12 `confirmed`
> Fuente: Adenda 1 (7)

El gestor reverifica el SHA-256 al leer de la caché. Si el archivo cacheado no coincide con el manifiesto, se descarta y el asset se trata como no cacheado (descarga con red, superficie de respaldo sin ella).

### REQ-13 `confirmed` `enforcement`
> Fuente: Pedido de enmienda (1)

La implementación simulada de DownloadUrlProvider no viaja en el binario: vive solo en app/test/core/assets/fake_download_url_provider.dart. En app/lib/core/assets/ solo se define la interfaz DownloadUrlProvider y la constante kMaxHashRetries.

### REQ-14 `confirmed` `enforcement`
> Fuente: pedido de cambio: S2.T5

La integración con el resolvedor se prueba contra el consumo real de ResolvedImage: antes de escribir las pruebas de app/test/core/images/ se confirma con Grep que EditorialIllustration (app/lib/core/images/editorial_illustration.dart) consume ResolvedImage; si no, se monta un widget mínimo de prueba que lo consuma. Se cubren: secuencia descargando y disponible; descargando y respaldo ante fallo de hash; asset cacheado y válido emite disponible sin pasar por descargando; Semantics.label igual al alt aportado por el resolvedor o identity_assets.dart con un Text de relleno visible (QA-02-09-02); sin excepciones sin red (tester.takeException() == null); desmontaje con descarga en curso sin setState tras dispose y sin parciales; tras el desmontaje, un pedido posterior con red completa la descarga desde cero.

### REQ-15 `confirmed` `variant`
> Fuente: sonda:card-docs-de-superficie-6c8ae176a6

Variante docs, guarda de alcance: los documentos de superficie raíz no se modifican. El diff contra main de README.md, CONTRIBUTING.md, docs/development/commands.md y docs/development/release-runbook.md debe estar vacío.
## Tasks

#### S1.T1 — Agregar la dependencia con `cd app && fvm flutter pub add flutter_cache_manager` usando el Flutter de .fvmrc. Debe quedar ^x.y.z en app/pubspec.yaml y la versión exacta en app/pubspec.lock. No se prueban otras versiones.
Contrato: rollback: Revertir app/pubspec.yaml y app/pubspec.lock con git checkout y correr `cd app && fvm flutter pub get`.. Status: done

#### S1.T5 — Define en app/lib/core/assets/ solo la interfaz DownloadUrlProvider (recibe la clave derivados/<sha256>/<nombre>.webp y devuelve la URL presignada) y la constante con nombre kMaxHashRetries = 1 (2 solicitudes en total ante hash invalido). No crea implementacion simulada ni endpoint real.
Contrato: rollback: Eliminar los archivos de la interfaz DownloadUrlProvider y de la constante kMaxHashRetries creados en app/lib/core/assets/ (git checkout -- app/lib/core/assets o borrar los archivos nuevos); no queda ninguna otra referencia.. Status: done

#### S1.T6 — Crear el gestor de descargas en app/lib/core/assets/ sobre flutter_cache_manager (agregado en S1.T1), dio, crypto (^3.0.7) y path_provider; importa DownloadUrlProvider y kMaxHashRetries de S1.T5. (a) Lee app/assets/manifest.json y toma solo id, mode y, por derivado, path, bytes y sha256; filtra mode == descargable y nunca solicita un asset empaquetado; version y priority no existen; alt existe en la entrada pero lo aporta el resolvedor o identity_assets.dart y no se copia al gestor. (b) Para un descargable no cacheado con red, pide al DownloadUrlProvider la clave derivados/<sha256>/<nombre>.webp (nombre = ultimo segmento de path, con su extension .webp) y usa solo la URL presignada que entrega; la clave de cache es el sha256. (c) Descarga a un archivo temporal y lo promueve a la cache solo tras verificar el SHA-256 y que el tamano recibido coincide con bytes del manifiesto. (d) Ante hash invalido reintenta exactamente kMaxHashRetries veces (2 solicitudes en total); si falla el segundo intento informa el error por tipo, devuelve el estado de superficie de respaldo y no cachea nada. (e) Reverifica el SHA-256 al leer de la cache; si no coincide descarta el archivo y lo trata como no cacheado. (f) Ante un sha256 nuevo en el manifiesto descarga la clave nueva y elimina la entrada anterior; sin red no entrega la anterior. (g) Al cancelar o truncarse el cuerpo borra el temporal y no deja parciales expuestos. (h) Metricas solo como conteos y tamanos agregados por tipo (success, hashMismatch, offline, cancelled, bytes), sin claves, nombres de archivo ni URLs. (i) Se expone como provider Riverpod con @Riverpod(keepAlive: true), con el mismo mecanismo de generacion de codigo que app/lib/core/preferences/ (por ejemplo preference_controller.dart); si requiere archivos .g.dart se generan con el comando que ya usa el repo y se versionan como los existentes. Implementar por incisos usando S1.T7 como red de seguridad.
Contrato: rollback: Eliminar los archivos del gestor en app/lib/core/assets/ y su provider generado con git revert de la task.. Status: done

#### S1.T7 — Crear app/test/core/assets/fake_download_url_provider.dart (implementacion simulada de DownloadUrlProvider, solo en tests) y app/test/core/assets/downloadable_asset_manager_test.dart con un servidor HTTP local, importando kMaxHashRetries y DownloadUrlProvider de produccion. Casos: descarga valida (File con bytes identicos, queda en cache); byte alterado (rechazo, 2 solicitudes en total, nada en cache); primer intento alterado y reintento correcto (2 solicitudes); servido desde cache sin red; con red y manifiesto sin cambios un segundo pedido no genera solicitud (contador del servidor = 1); nunca descargado y sin red (respaldo); sha256 nuevo descarga la clave nueva y elimina la anterior; con v1 cacheada, sha256 nuevo y sin red: respaldo y no entrega v1; cache alterada en disco (se descarta); asset empaquetado: 0 solicitudes; clave pedida derivados/<sha256>/<nombre>.webp (por ejemplo animales-ashura/casa-01-lobo-miniatura.webp da casa-01-lobo-miniatura.webp) y URL usada exactamente la del proveedor sin datos de la persona; cancelacion y cuerpo truncado sin parciales; metricas exactas (success=2, bytes=150, hashMismatch=1; offline=1 sin bytes; cancelled=1 sin bytes) y volcado sin claves, nombres ni URLs; el provider es keepAlive (dos lecturas en el mismo ProviderContainer devuelven la misma instancia); no existe flag de desactivacion.
Contrato: rollback: Eliminar los dos archivos de prueba en app/test/core/assets/ con git revert de la task.. Status: done

#### S2.T5 — Pruebas en app/test/core/images/. Antes de escribirlas confirma con Grep que EditorialIllustration (app/lib/core/images/editorial_illustration.dart) consume ResolvedImage; si no, monta un widget minimo de prueba que lo consuma. Casos: secuencia descargando y disponible; descargando y respaldo cuando falla el hash; asset cacheado y valido emite disponible sin pasar por descargando; Semantics.label igual al alt aportado por el resolvedor o identity_assets.dart con un Text de relleno visible (QA-02-09-02); tester.takeException() == null sin red; desmontaje con descarga en curso sin setState tras dispose y sin parciales; tras el desmontaje, un pedido posterior con red completa la descarga desde cero. Los casos del gestor viven en S1.T7.
Contrato: rollback: Revertir los archivos de prueba agregados o ajustados en app/test/core/images/ con git revert de la task.. Status: done

#### S2.T6 — Integra el gestor con el resolvedor de HU-01-02. Antes de implementar lee app/lib/core/images/image_family_resolver.dart y app/lib/core/images/identity_assets.dart y confirma si ResolvedImage (sellado) puede expresar 'descargando' sin cambiar la firma pública de ImageFamilyResolver. Si requiere una variante nueva del sellado, agrégala, adapta los switch de todos los consumidores y repórtalos. El alt lo sigue aportando el resolvedor o identity_assets.dart. Los tests de regresión están en app/test/core/images/.
Contrato: rollback: Revertir los cambios en app/lib/core/images/ y los consumidores adaptados con git revert de la task.. Status: done

#### S3.T4 — Documentar el uso del gestor, la configuracion del origen de descarga (DownloadUrlProvider y URL presignada de corta vida) y el comportamiento sin conexion en docs/development/configuration.md y en scripts/assets/README.md, enlazando la DEC-240. No se tocan README.md raiz, CONTRIBUTING.md, docs/development/commands.md ni docs/development/release-runbook.md.
Contrato: rollback: Revertir el commit de la task: restaurar docs/development/configuration.md y scripts/assets/README.md.. Status: pending

#### S3.T5 — Validar los documentos tocados con el linter de docs: markdownlint-cli2, cspell y vale sobre docs/development/configuration.md y scripts/assets/README.md, y la verificacion de docs sobre los cambios contra main. Los enlaces rotos los detecta lychee dentro de docs.mjs check, no markdownlint.
Contrato: rollback: Sin cambios de codigo: si el lint falla, corregir los documentos de la task anterior; no hay nada que revertir en esta task.. Status: pending
## Cambios al modelo de datos

Ninguno.

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-01 (edit) `confirmed`: Cuando una vista pide un asset descargable que no está cacheado y hay red, el gestor obtiene una URL presignada de corta vida a través de un
- REQ-02 (edit) `confirmed`: Un archivo cuyo SHA-256 no coincide con el del manifiesto se descarta antes de exponerse. El reintento ante hash inválido es exactamente 1, 
- REQ-03 (edit) `confirmed`: Un asset ya cacheado y con hash válido se sirve sin red. Un asset nunca descargado y sin red deja la superficie de respaldo, sin error visib
- REQ-04 (edit) `confirmed`: Como la clave es por hash, una versión nueva del asset se expresa en app/assets/manifest.json con un sha256 distinto. Cuando el manifiesto t
- REQ-10 (add) `confirmed`: Integración sin romper contratos: el gestor se crea en app/lib/core/assets/ y se integra con app/lib/core/images/image_family_resolver.dart 
- REQ-11 (add) `confirmed`: Límites de alcance: la única dependencia nueva permitida es flutter_cache_manager (crypto ^3.0.7, dio y path_provider ya están en app/pubspe
- REQ-12 (add) `confirmed`: El gestor reverifica el SHA-256 al leer de la caché. Si el archivo cacheado no coincide con el manifiesto, se descarta y el asset se trata c

**Tasks agregadas:**

- S1: Definir en app/lib/core/assets/ la constante con nombre kMaxHashRetries = 1 (reintentos ante hash inválido, 2 solicitudes en total) y la interfaz DownloadUrlProvider (entrega la URL presignada para la clave derivados/<sha256>/<nombre>.webp) con una implementación simulada para pruebas. El endpoint real no se implementa. (valida: REQ-01, REQ-02, REQ-11; rollback: Eliminar los archivos nuevos de app/lib/core/assets/ de la constante y la interfaz; git revert del commit de la task.)
- S2: Integrar el gestor con app/lib/core/images/image_family_resolver.dart (ResolvedImage sellado) y app/lib/core/images/identity_assets.dart para devolver disponible, descargando o superficie de respaldo, sin cambiar la firma pública de ImageFamilyResolver. Leer ambos archivos antes de editarlos. (valida: REQ-03, REQ-06, REQ-10; rollback: git revert del commit de la task; los archivos de lib/core/images vuelven a su estado previo y los assets empaquetados siguen resolviéndose sin descarga.)
- S2: Reverificar el SHA-256 al leer de la caché: si no coincide con app/assets/manifest.json, descartar el archivo y tratar el asset como no cacheado. (valida: REQ-12, REQ-03; rollback: git revert del commit de la task; la lectura de caché vuelve al comportamiento anterior.)
- S3: Pruebas deterministas con servidor de archivos local simulado y DownloadUrlProvider simulado: hash alterado con kMaxHashRetries = 1 (exactamente 2 solicitudes y caché vacía), segundo intento válido, reemplazo por sha256 nuevo, reverificación en caché y modo sin red. (valida: REQ-01, REQ-02, REQ-03, REQ-04, REQ-12, test; rollback: Eliminar o revertir los archivos de test agregados; no afecta código de producción.)
- S3: Actualizar docs/development/configuration.md y scripts/assets/README.md con el uso del gestor, el origen de descarga por URL presignada (DEC-240) y el comportamiento sin conexión. No tocar README raíz, CONTRIBUTING, commands.md ni release-runbook. (valida: REQ-08; rollback: git revert del commit de la task; la documentación vuelve a su estado previo.)
- S3: Validar el lint de docs sobre los archivos tocados con el chequeo del repo; los enlaces rotos los detecta lychee dentro de docs.mjs check, no markdownlint. (valida: REQ-08; rollback: No modifica archivos; no requiere rollback.)

### Enmienda 2

**Task ops:**

- edit S1.T2 { desc="Implementar en app/lib/core/assets/ el gestor de descargas sobre flutter_cache_manager (agregado una sola vez con `cd app && fvm flutter pub add flutter_cache_manager`, formato ^x.y.z en pubspec.yaml y version exacta en pubspec.lock, sin probar otras versiones). S1.T2.1: leer app/assets/manifest.json y tomar solo id, mode y, por derivado, path, bytes y sha256 (no existen ni se usan version, priority ni alt); filtrar mode == 'descargable' y nunca solicitar un asset 'empaquetado'. S1.T2.2: para un descargable no cacheado con red, pedir a DownloadUrlProvider la clave derivados/<sha256>/<nombre>.webp (nombre = ultimo segmento de path), usar solo la URL presignada que entrega el proveedor (sin armar URL con origen mas version), descargar a un temporal y verificar el SHA-256 antes de promoverlo a la cache; la clave de cache es el sha256, no una version. S1.T2.3: reverificar el SHA-256 al leer de la cache; si no coincide, descartar el archivo y tratar el asset como no cacheado. S1.T2.4: ante hash invalido reintentar exactamente kMaxHashRetries = 1 (2 solicitudes en total); si el segundo intento falla, informar error por tipo, devolver el estado de superficie de respaldo y no cachear nada. S1.T2.5: si el manifiesto trae un sha256 nuevo para un derivado, descargar la clave nueva y eliminar de la cache la entrada anterior; cancelar o cerrar la vista no deja archivos parciales expuestos. S1.T2.6: registrar metricas solo como conteos y tamanos agregados por tipo (exito, hash invalido, sin red, cancelado), sin nombres de archivo, claves ni URLs. Exponer el gestor como provider Riverpod con @Riverpod(keepAlive: true), igual que AccessibilityPreferencesController; los catch ignorados llevan comentario con el motivo, como _readApplied.", rollback="Revertir el commit de la task: quitar app/lib/core/assets/ y la dependencia flutter_cache_manager de app/pubspec.yaml y app/pubspec.lock; los assets empaquetados no se ven afectados.", validates=["REQ-01","REQ-02","REQ-04","REQ-05","REQ-07","REQ-09","REQ-12"], isTest=false, verify=["cd app && fvm flutter analyze lib/core/assets","cd app && fvm flutter test test/core/assets"] }
- edit S1.T3 { desc="Escribir las pruebas unitarias del gestor en app/test/core/assets/, incluyendo en este mismo conjunto una implementacion simulada de DownloadUrlProvider (sin endpoint real) y la constante kMaxHashRetries = 1. Casos con valores concretos: descarga con hash valido se cachea y se entrega; archivo con un byte alterado se rechaza, hay exactamente 2 solicitudes y no se cachea nada; asset descargado se sirve sin red; asset nunca descargado y sin red devuelve superficie de respaldo; sha256 nuevo en el manifiesto descarga la clave nueva y elimina la anterior; archivo cacheado alterado se descarta y se trata como no cacheado; un asset con mode 'empaquetado' nunca se solicita; la clave pedida al proveedor es derivados/<sha256>/<nombre>.webp; cancelar la descarga no deja archivos parciales; las metricas solo contienen conteos y tamanos agregados. No se agrega un tercer archivo de pruebas con los mismos casos.", rollback="Revertir el commit de la task: eliminar los archivos de prueba de app/test/core/assets/.", validates=["REQ-01","REQ-02","REQ-03","REQ-04","REQ-05","REQ-07","REQ-12"], isTest=true, verify=["cd app && fvm flutter test test/core/assets"] }
- delete S2.T1
- edit S2.T4 { desc="Unica task de integracion: leer app/lib/core/images/image_family_resolver.dart (ResolvedImage sellado) y app/lib/core/images/identity_assets.dart antes de tocarlos, e integrar el gestor de app/lib/core/assets/ para exponer al resolvedor los tres estados observables: disponible (con el archivo), descargando o superficie de respaldo. No se cambia la firma publica de ImageFamilyResolver. El alt de la superficie de respaldo lo aporta el resolvedor o identity_assets.dart; el gestor no lo copia ni lo inventa. Un asset empaquetado se resuelve sin descarga.", rollback="Revertir el commit de la task: restaurar image_family_resolver.dart e identity_assets.dart a su version anterior; el gestor queda sin consumidores.", validates=["REQ-03","REQ-06","REQ-10"], isTest=false, verify=["cd app && fvm flutter analyze lib/core/images lib/core/assets","cd app && fvm flutter test test/core/images"] }
- delete S2.T5
- delete S3.T1
- delete S3.T2
- delete S3.T3
- edit S3.T4 { desc="Documentar el uso del gestor, la configuracion del origen de descarga (DownloadUrlProvider y URL presignada de corta vida) y el comportamiento sin conexion en docs/development/configuration.md y en scripts/assets/README.md, enlazando la DEC-240. No se tocan README.md raiz, CONTRIBUTING.md, docs/development/commands.md ni docs/development/release-runbook.md.", rollback="Revertir el commit de la task: restaurar docs/development/configuration.md y scripts/assets/README.md.", validates=["REQ-08"], isTest=false, verify=["test -z \"$(git diff --name-only main -- README.md CONTRIBUTING.md docs/development/commands.md docs/development/release-runbook.md)\"","git diff --name-only main -- docs/development/configuration.md scripts/assets/README.md"] }
- edit S3.T5 { desc="Validar los documentos tocados con el linter de docs: markdownlint-cli2, cspell y vale sobre docs/development/configuration.md y scripts/assets/README.md, y la verificacion de docs sobre los cambios contra main. Los enlaces rotos los detecta lychee dentro de docs.mjs check, no markdownlint.", rollback="Sin cambios de codigo: si el lint falla, corregir los documentos de la task anterior; no hay nada que revertir en esta task.", validates=["REQ-08"], isTest=false, verify=["node_modules/.bin/markdownlint-cli2 docs/development/configuration.md scripts/assets/README.md && node_modules/.bin/cspell --no-progress docs/development/configuration.md scripts/assets/README.md","vale --minAlertLevel=suggestion docs/development/configuration.md scripts/assets/README.md","DOCS_DIFF_BASE=main node scripts/dev/docs.mjs check:changed"] }

### Enmienda 3

**Task ops:**

- edit S1.T2 { desc="Implementar el gestor de descargas en app/lib/core/assets/ sobre flutter_cache_manager, que ya fue instalado por S1.T1 (esta task no ejecuta `fvm flutter pub add`). Depende de S1.T4: importa DownloadUrlProvider y kMaxHashRetries de app/lib/core/assets/ y no los redefine. Filtra el manifiesto app/assets/manifest.json por mode == 'descargable' y nunca solicita un empaquetado. Pide la URL presignada al DownloadUrlProvider para la clave derivados/<sha256>/<nombre>.webp (nombre = último segmento de path), verifica el SHA-256 antes de exponer el archivo, usa el sha256 como clave de caché y reintenta ante hash inválido según kMaxHashRetries. El manifiesto no trae version ni priority; alt existe en la entrada del asset pero lo aporta el resolvedor o identity_assets.dart y no se copia al gestor. Los tests los corre S1.T3.", verify=["cd app && fvm flutter analyze lib/core/assets"] }
- edit S1.T3 { desc="Escribir las pruebas unitarias del gestor en el archivo app/test/core/assets/downloadable_asset_manager_test.dart. Las pruebas importan kMaxHashRetries y el DownloadUrlProvider simulado de producción (S1.T4) y no los redefinen. La clave cubierta es derivados/<sha256>/<nombre>.webp. Cubren verificación de hash, reintento ante hash inválido (2 solicitudes en total), reemplazo por sha256 nuevo y reverificación al leer de la caché.", isTest=true, verify=["cd app && fvm flutter test test/core/assets/downloadable_asset_manager_test.dart"] }
- edit S2.T3 { desc="Escribir el test de integración con el resolvedor. El widget consumidor es el que ya usa ImageFamilyResolver en app/lib/, que se localiza con Grep antes de escribir el test. Si no existe ninguno, el test monta un widget mínimo de prueba que consume ResolvedImage. Verifica los tres estados observables: disponible, descargando y superficie de respaldo.", isTest=true }

### Enmienda 4
**REQs:**

- REQ-03 (edit) `confirmed`: Un asset ya cacheado y con hash válido se sirve sin red. Un asset nunca descargado y sin red deja la superficie de respaldo, sin error visib
- REQ-04 (edit) `confirmed`: Como la clave es por hash, una versión nueva del asset se expresa en app/assets/manifest.json con un sha256 distinto. Cuando el manifiesto t
- REQ-05 (edit) `inferred`: Si la vista se cierra o el pedido se cancela con una descarga en curso, o el cuerpo llega truncado (tamaño recibido distinto de bytes del ma
- REQ-13 (add) `confirmed`: La implementación simulada de DownloadUrlProvider no viaja en el binario: vive solo en app/test/core/assets/fake_download_url_provider.dart.

**Tasks agregadas:**

- S1: Define en app/lib/core/assets/ solo la interfaz DownloadUrlProvider y la constante con nombre kMaxHashRetries = 1 (2 solicitudes en total ante hash inválido). La interfaz recibe la clave inmutable derivados/<sha256>/<nombre>.webp y devuelve la URL presignada de corta vida; es la única URL que usa el gestor (DEC-240). No se crea ninguna implementación simulada ni real: el fake lo crea S1.T4 en app/test/core/assets/fake_download_url_provider.dart y el endpoint real del servidor queda fuera de alcance. (valida: REQ-01, REQ-02, REQ-13; rollback: Eliminar los archivos de la interfaz y de la constante en app/lib/core/assets/ con git revert de la task.)
- S1: Crea el gestor de descargas en app/lib/core/assets/ sobre flutter_cache_manager (agregado en S1.T1), dio, crypto (^3.0.7) y path_provider. Lee app/assets/manifest.json y filtra entradas con mode == 'descargable'; nunca solicita un empaquetado. Pide la URL a DownloadUrlProvider con la clave derivados/<sha256>/<nombre>.webp (nombre = último segmento de path) y usa solo esa URL. Incisos: (a) descarga a un archivo temporal que se promueve a la caché solo tras verificar el SHA-256; (b) hash inválido: descarta y reintenta kMaxHashRetries veces (2 solicitudes en total); si el segundo intento falla informa error por tipo hashMismatch, estado superficie de respaldo y no cachea nada; (c) al cancelar o truncarse el cuerpo (tamaño recibido distinto de bytes del manifiesto) el temporal se borra y no queda archivo parcial expuesto; (d) la clave de caché es el sha256 y ante un sha256 nuevo en el manifiesto se elimina la entrada anterior; (e) reverifica el SHA-256 al leer de la caché: si no coincide se descarta y se trata como no cacheado (descarga con red, respaldo sin ella); (f) sin caché ni red devuelve respaldo sin error bloqueante; (g) expone estados disponible, descargando y respaldo; el alt no se copia al gestor; (h) métricas solo como conteos y tamaños agregados por tipo (success, hashMismatch, offline, cancelled, bytes) sin claves, nombres de archivo ni URLs. Se expone como provider Riverpod con @Riverpod(keepAlive: true), igual que AccessibilityPreferencesController; los catch ignorados llevan comentario del motivo, como _readApplied. (valida: REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, REQ-06, REQ-07, REQ-09, REQ-12; rollback: Eliminar los archivos del gestor en app/lib/core/assets/ y su provider generado con git revert de la task.)
- S1: Crea app/test/core/assets/fake_download_url_provider.dart (implementación simulada de DownloadUrlProvider, solo en tests) y app/test/core/assets/downloadable_asset_manager_test.dart con TODOS estos casos: descarga válida; byte alterado con 2 solicitudes; reintento exitoso; servido desde caché sin red; nunca descargado sin red; sha256 nuevo reemplaza al anterior; caché alterada; empaquetado sin ninguna solicitud HTTP; clave derivados/<sha256>/<nombre>.webp; cancelación y cuerpo truncado sin parciales; métricas exactas (success=2, bytes=150, hashMismatch=1; offline=1 sin bytes) y volcado sin claves ni URLs. Usa servidor de archivos local y corte de red simulado. (valida: REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, REQ-07, REQ-12, REQ-13, test; rollback: Eliminar los dos archivos de prueba en app/test/core/assets/ con git revert de la task.)
- S2: Escribe las pruebas de los estados del resolvedor y del widget en app/test/core/images/ (ya existe, con image_family_resolver_test.dart): secuencia descargando, disponible y respaldo; Semantics.label igual al alt aportado por el resolvedor o identity_assets.dart; tester.takeException() == null; desmontaje del widget con una descarga en curso sin errores ni parciales. Solo cubre estados del resolvedor y widget; los casos del gestor viven en S1.T4. (valida: REQ-03, REQ-05, REQ-06, test; rollback: Revertir los archivos de prueba agregados o ajustados en app/test/core/images/ con git revert de la task.)
- S2: Integra el gestor con el resolvedor de HU-01-02. Antes de implementar lee app/lib/core/images/image_family_resolver.dart y app/lib/core/images/identity_assets.dart y confirma si ResolvedImage (sellado) puede expresar 'descargando' sin cambiar la firma pública de ImageFamilyResolver. Si requiere una variante nueva del sellado, agrégala, adapta los switch de todos los consumidores y repórtalos. El alt lo sigue aportando el resolvedor o identity_assets.dart. Los tests de regresión están en app/test/core/images/. (valida: REQ-06, REQ-10; rollback: Revertir los cambios en app/lib/core/images/ y los consumidores adaptados con git revert de la task.)
- S3: Documenta en docs/development/configuration.md el uso del gestor, la configuración del origen de descarga (URL presignada vía DownloadUrlProvider) y el comportamiento sin conexión. No se tocan README raíz, CONTRIBUTING, commands.md ni release-runbook. Valida con node_modules/.bin/markdownlint-cli2, node_modules/.bin/cspell --no-progress y vale --minAlertLevel=suggestion sobre el archivo, y DOCS_DIFF_BASE=main node scripts/dev/docs.mjs check:changed. (valida: REQ-08; rollback: Revertir los cambios de docs/development/configuration.md con git revert de la task.)
- S3: Documenta en scripts/assets/README.md el origen de descarga y el comportamiento sin conexión, y enlaza la DEC-240 en docs/product/decisiones/DEC-240-origen-y-presupuesto-de-assets-sobre-railway.md. Valida con node_modules/.bin/markdownlint-cli2, node_modules/.bin/cspell --no-progress y vale --minAlertLevel=suggestion sobre el archivo, y DOCS_DIFF_BASE=main node scripts/dev/docs.mjs check:changed (lychee detecta enlaces rotos dentro de docs.mjs check). (valida: REQ-08; rollback: Revertir los cambios de scripts/assets/README.md con git revert de la task.)

**Task ops:**

- delete S1.T2
- delete S1.T3
- delete S1.T4

### Enmienda 5

**Task ops:**

- edit S1.T1 { verify=["grep -E \"^  flutter_cache_manager: \\^\" app/pubspec.yaml","! (git diff main -- app/pubspec.yaml | grep -E \"^[+-] \" | grep -v flutter_cache_manager)"] }
- edit S1.T5 { desc="Agregar el fake DownloadUrlProvider en app/test/core/assets/fake_download_url_provider.dart, que NO viaja en el binario (REQ-13). Este archivo lo crea S1.T7; esta task lo usa como dependencia de prueba y no lo duplica en app/lib/core/assets/." }
- edit S1.T7 { desc="Escribir los casos del gestor en app/test/core/assets/ y crear app/test/core/assets/fake_download_url_provider.dart (el fake nunca va en app/lib). Además de los casos existentes, suma: (a) el provider del gestor es keepAlive: dos lecturas en el mismo ProviderContainer devuelven la misma instancia; (b) con la v1 cacheada, un manifiesto con sha256 nuevo y sin red emite superficie de respaldo y no entrega la v1." }
- edit S2.T5 { desc="Test de widget que monta EditorialIllustration (app/lib/core/images/editorial_illustration.dart) con un Text de relleno al lado. Aún no existe la ficha de llegada y no se crea ningún widget de producción. Los casos del gestor viven en S1.T7 (no se duplican aquí). Suma el caso: un asset cacheado y válido emite disponible sin pasar por descargando." }
- edit S2.T6 { verify=["cd app && fvm flutter analyze","cd app && fvm flutter test test/core/images"] }

### Enmienda 6

**Task ops:**

- edit S1.T5 { desc="Define en app/lib/core/assets/ solo la interfaz DownloadUrlProvider (recibe la clave derivados/<sha256>/<nombre>.webp y devuelve la URL presignada) y la constante con nombre kMaxHashRetries = 1 (2 solicitudes en total ante hash invalido). No crea implementacion simulada ni endpoint real.", rollback="Eliminar los archivos de la interfaz DownloadUrlProvider y de la constante kMaxHashRetries creados en app/lib/core/assets/ (git checkout -- app/lib/core/assets o borrar los archivos nuevos); no queda ninguna otra referencia.", validates=["REQ-01","REQ-02","REQ-13"], isTest=false, verify=["cd app && fvm flutter analyze lib/core/assets"] }
- edit S1.T7 { desc="Crea app/test/core/assets/fake_download_url_provider.dart (implementacion simulada de DownloadUrlProvider, solo en tests) y app/test/core/assets/downloadable_asset_manager_test.dart con un servidor HTTP local y estos casos: descarga valida (File con bytes identicos, queda en cache); byte alterado (rechazo, 2 solicitudes en total, nada en cache); primer intento alterado y reintento correcto (2 solicitudes); servido desde cache sin red; nunca descargado y sin red (respaldo); sha256 nuevo en el manifiesto descarga la clave nueva y elimina la anterior; con v1 cacheada, sha256 nuevo y sin red: respaldo y no entrega v1; cache alterada en disco (se descarta); asset empaquetado: 0 solicitudes; clave pedida derivados/<sha256>/<nombre>.webp, donde nombre es el ultimo segmento de path incluida su extension .webp (ej. animales-ashura/casa-01-lobo-miniatura.webp da casa-01-lobo-miniatura.webp) y la URL usada es exactamente la del proveedor sin datos de la persona; cancelacion y cuerpo truncado sin parciales; metricas exactas (success=2, bytes=150, hashMismatch=1; offline=1 sin bytes; cancelled=1 sin bytes) y volcado sin claves, nombres ni URLs; el provider del gestor es keepAlive (dos lecturas en el mismo ProviderContainer devuelven la misma instancia); no existe flag de desactivacion. Importa kMaxHashRetries y DownloadUrlProvider de produccion.", validates=["REQ-01","REQ-02","REQ-03","REQ-04","REQ-05","REQ-07","REQ-09","REQ-11","REQ-12","REQ-13"], isTest=true, verify=["cd app && fvm flutter test test/core/assets/downloadable_asset_manager_test.dart"] }
- edit S2.T5 { desc="Antes de escribir, confirma con Grep que EditorialIllustration (app/lib/core/images/editorial_illustration.dart) consume ResolvedImage; si no, monta un widget minimo de prueba que lo consuma. Pruebas en app/test/core/images/: secuencia descargando y disponible, y descargando y respaldo cuando falla el hash; asset cacheado valido emite disponible sin pasar por descargando; Semantics.label igual al alt aportado por el resolvedor o identity_assets.dart con un Text de relleno visible (QA-02-09-02); tester.takeException() == null sin red; desmontaje con descarga en curso sin setState tras dispose y sin parciales. Los casos del gestor viven en S1.T7.", validates=["REQ-03","REQ-05","REQ-06","REQ-10"], isTest=true, verify=["cd app && fvm flutter test test/core/images"] }
- edit S3.T4 { verify=["node_modules/.bin/markdownlint-cli2 docs/development/configuration.md scripts/assets/README.md","test -n \"$(git diff --name-only main -- docs/development/configuration.md scripts/assets/README.md)\""] }

### Enmienda 7

**Task ops:**

- edit S1.T7 { desc="AGREGAR al final de la desc vigente (conservando todo el texto y los casos ya enumerados), sin quitar nada: casos nuevos de prueba. (a) Con red y manifiesto sin cambios, un segundo pedido no genera solicitud: el contador del servidor de prueba es 1 tras dos pedidos con el mismo sha256. (b) Una cancelacion incrementa cancelled=1 sin sumar bytes a las metricas agregadas." }
- edit S2.T5 { desc="AGREGAR al final de la desc vigente (conservando todo el texto y los casos ya enumerados), sin quitar nada: caso nuevo de prueba. Tras desmontar el widget durante la descarga, un pedido posterior con red completa la descarga desde cero." }
- edit S1.T6 { desc="AGREGAR al final de la desc vigente (conservando todo el texto y los casos ya enumerados), sin quitar nada: el provider usa el mismo mecanismo de generacion de codigo que app/lib/core/preferences/ (por ejemplo preference_controller.dart). Si requiere archivos .g.dart, se generan con el comando que ya usa el repo y se versionan igual que los existentes." }

### Enmienda 8
**REQs:**

- REQ-14 (add) `confirmed`: La integración con el resolvedor se prueba contra el consumo real de ResolvedImage: antes de escribir las pruebas de app/test/core/images/ s
- REQ-15 (add) `confirmed`: Variante docs, guarda de alcance: los documentos de superficie raíz no se modifican. El diff contra main de README.md, CONTRIBUTING.md, docs

**Task ops:**

- edit S1.T6 { desc="Crear el gestor de descargas en app/lib/core/assets/ sobre flutter_cache_manager (agregado en S1.T1), dio, crypto (^3.0.7) y path_provider; importa DownloadUrlProvider y kMaxHashRetries de S1.T5. (a) Lee app/assets/manifest.json y toma solo id, mode y, por derivado, path, bytes y sha256; filtra mode == descargable y nunca solicita un asset empaquetado; version y priority no existen; alt existe en la entrada pero lo aporta el resolvedor o identity_assets.dart y no se copia al gestor. (b) Para un descargable no cacheado con red, pide al DownloadUrlProvider la clave derivados/<sha256>/<nombre>.webp (nombre = ultimo segmento de path, con su extension .webp) y usa solo la URL presignada que entrega; la clave de cache es el sha256. (c) Descarga a un archivo temporal y lo promueve a la cache solo tras verificar el SHA-256 y que el tamano recibido coincide con bytes del manifiesto. (d) Ante hash invalido reintenta exactamente kMaxHashRetries veces (2 solicitudes en total); si falla el segundo intento informa el error por tipo, devuelve el estado de superficie de respaldo y no cachea nada. (e) Reverifica el SHA-256 al leer de la cache; si no coincide descarta el archivo y lo trata como no cacheado. (f) Ante un sha256 nuevo en el manifiesto descarga la clave nueva y elimina la entrada anterior; sin red no entrega la anterior. (g) Al cancelar o truncarse el cuerpo borra el temporal y no deja parciales expuestos. (h) Metricas solo como conteos y tamanos agregados por tipo (success, hashMismatch, offline, cancelled, bytes), sin claves, nombres de archivo ni URLs. (i) Se expone como provider Riverpod con @Riverpod(keepAlive: true), con el mismo mecanismo de generacion de codigo que app/lib/core/preferences/ (por ejemplo preference_controller.dart); si requiere archivos .g.dart se generan con el comando que ya usa el repo y se versionan como los existentes. Implementar por incisos usando S1.T7 como red de seguridad." }
- edit S1.T7 { desc="Crear app/test/core/assets/fake_download_url_provider.dart (implementacion simulada de DownloadUrlProvider, solo en tests) y app/test/core/assets/downloadable_asset_manager_test.dart con un servidor HTTP local, importando kMaxHashRetries y DownloadUrlProvider de produccion. Casos: descarga valida (File con bytes identicos, queda en cache); byte alterado (rechazo, 2 solicitudes en total, nada en cache); primer intento alterado y reintento correcto (2 solicitudes); servido desde cache sin red; con red y manifiesto sin cambios un segundo pedido no genera solicitud (contador del servidor = 1); nunca descargado y sin red (respaldo); sha256 nuevo descarga la clave nueva y elimina la anterior; con v1 cacheada, sha256 nuevo y sin red: respaldo y no entrega v1; cache alterada en disco (se descarta); asset empaquetado: 0 solicitudes; clave pedida derivados/<sha256>/<nombre>.webp (por ejemplo animales-ashura/casa-01-lobo-miniatura.webp da casa-01-lobo-miniatura.webp) y URL usada exactamente la del proveedor sin datos de la persona; cancelacion y cuerpo truncado sin parciales; metricas exactas (success=2, bytes=150, hashMismatch=1; offline=1 sin bytes; cancelled=1 sin bytes) y volcado sin claves, nombres ni URLs; el provider es keepAlive (dos lecturas en el mismo ProviderContainer devuelven la misma instancia); no existe flag de desactivacion.", validates=["REQ-01","REQ-02","REQ-03","REQ-04","REQ-05","REQ-07","REQ-09","REQ-11","REQ-12","REQ-13"] }
- edit S2.T5 { desc="Pruebas en app/test/core/images/. Antes de escribirlas confirma con Grep que EditorialIllustration (app/lib/core/images/editorial_illustration.dart) consume ResolvedImage; si no, monta un widget minimo de prueba que lo consuma. Casos: secuencia descargando y disponible; descargando y respaldo cuando falla el hash; asset cacheado y valido emite disponible sin pasar por descargando; Semantics.label igual al alt aportado por el resolvedor o identity_assets.dart con un Text de relleno visible (QA-02-09-02); tester.takeException() == null sin red; desmontaje con descarga en curso sin setState tras dispose y sin parciales; tras el desmontaje, un pedido posterior con red completa la descarga desde cero. Los casos del gestor viven en S1.T7.", validates=["REQ-06","REQ-14"] }
- edit S3.T4 { verify=["test -z \"$(git diff --name-only main -- README.md CONTRIBUTING.md docs/development/commands.md docs/development/release-runbook.md)\""] }

### Enmienda 9

**Task ops:**

- edit S3.T4 { validates=["REQ-08","REQ-15"] }

### Enmienda 10

**Tasks agregadas:**

- S3: Comprobar que la documentacion se escribio: docs/development/configuration.md y scripts/assets/README.md aparecen modificados contra main y ambos enlazan la DEC-240 (docs/product/decisiones/DEC-240-origen-y-presupuesto-de-assets-sobre-railway.md). (valida: REQ-08; rollback: Sin cambios de codigo: si falla, completar la documentacion de S3.T4.)

### Enmienda 11

**Task ops:**

- edit S3.T4 { validates=["REQ-08","REQ-15"], verify=["test -z \"$(git diff --name-only main -- README.md CONTRIBUTING.md docs/development/commands.md docs/development/release-runbook.md)\"","test -n \"$(git diff --name-only main -- docs/development/configuration.md scripts/assets/README.md)\"","grep -l \"DEC-240-origen-y-presupuesto-de-assets-sobre-railway\" docs/development/configuration.md scripts/assets/README.md | wc -l | grep -qx 2"] }
- delete S3.T6
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T5
- [x] S1.T6
- [x] S1.T7

**Gate (auto)**: `cd app && fvm flutter analyze lib/core/assets` y `cd app && fvm flutter test test/core/assets/downloadable_asset_manager_test.dart` pasan: un archivo correcto se entrega y queda en la caché, un byte alterado se rechaza con exactamente 2 solicitudes, cancelar o truncar el cuerpo no deja parciales, un sha256 nuevo en el manifiesto reemplaza a la entrada anterior y las métricas solo traen conteos y tamaños agregados.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T5
- [x] S2.T6

**Gate (auto)**: El resolvedor expone los tres estados (descargando, disponible, superficie de respaldo) para un asset descargable y los empaquetados siguen resolviendose sin descarga. cd app && fvm flutter analyze, cd app && fvm flutter test test/core/images y cd app && fvm flutter test test/core/assets pasan en verde, sin cambiar la firma publica de ImageFamilyResolver.

### Session 3 · T1 · open

**Tasks:**
- [ ] S3.T4
- [ ] S3.T5

**Gate (auto)**: docs/development/configuration.md y scripts/assets/README.md documentan el origen, las URLs inmutables, la verificación SHA-256 y el uso sin conexión con enlace a la DEC-240, el lint de docs sobre ambos termina en 0 y no hay cambios en README, CONTRIBUTING, commands.md ni release-runbook.
