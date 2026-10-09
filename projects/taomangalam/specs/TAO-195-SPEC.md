---
id: TAO-195-SPEC
project: taomangalam
ticket: TAO-195
status: approved
---

# TAO-195 · HU-02-01 Spike: origen de descarga de assets (bucket o CDN) y presupuesto de binario y caché

## Resumen ejecutivo

Se entrega una DEC nueva en docs/product/decisiones/ con: el origen elegido entre al menos dos alternativas (bucket solo o bucket con CDN delante) comparadas por costo, egress, latencia, URLs inmutables, invalidación, disponibilidad y operación desde Railway; el presupuesto en MB del binario iOS y Android y del conjunto descargable, estimado con una tabla de mediciones WebP reproducible sobre los 342 MB de maestros de app/assets/; la regla de qué es esencial y qué es descargable por familia (DEC-173, DEC-202); el versionado de URLs, la publicación del SHA-256 y el modo de lectura. También un prototipo descartable que acepta un derivado íntegro y rechaza uno alterado. Al cierre se actualizan doc 47 §5, doc 42 §4.4 y HU-02-02, HU-02-09 y HU-02-15. NO incluye la descarga y caché productivas (HU-02-09), el LRU (HU-02-15) ni los medios de la persona (EP-09). Cómo se sabe que funciona: la DEC cubre la lista QA-02-01-01 y el test del prototipo pasa para el archivo íntegro y falla para el que tiene un byte cambiado. Tamaño: 3 puntos en 2 sesiones. ADVERTENCIA: el commit 8e45d4d (TAO-190 sesión 1) dice haber dejado una 'DEC y tabla de mediciones revisables para HU-02-01, con prototipo'. Antes de escribir algo nuevo hay que revisar ese material y reusarlo o completarlo, sin duplicar la DEC. ADVERTENCIA: el prototipo no debe quedar referenciado desde lib/ ni desde pubspec.yaml, para que el build no dependa del origen evaluado (rollback del request).

Datos a confirmar antes de ejecutar:
- Número de la DEC nueva y la plantilla de DEC vigente: revisar docs/product/decisiones/ y el commit 8e45d4d (puede que ya exista un borrador).
- Rutas exactas de doc 47 (sección 5), doc 42 (sección 4.4) y doc 46 (sección 1): buscarlas en docs/product/.
- Ubicación del prototipo y de la tabla de mediciones que dejó TAO-190 sesión 1 (git show --stat 8e45d4d). Si no existen, la ruta propuesta es app/test/spike/hu_02_01_descarga_hash_test.dart.
- Tarifas vigentes de almacenamiento y egress de los proveedores comparados, y si Railway ofrece almacenamiento de objetos propio: confirmar en la documentación oficial de cada proveedor.
- Herramienta de conversión WebP y calidad usadas en las pruebas de content/imagenes/12, para reproducir la reducción de 85 % a 91 %.

## Requirements

### REQ-01 `inferred`
> Fuente: taomangalam/docs/backlog/EP-02_contenido_empaquetado_y_assets.md:114

Existe en docs/product/decisiones/ una DEC nueva que registra el origen de descarga elegido, al menos dos alternativas comparadas (almacenamiento de objetos solo y con CDN delante) por costo de almacenamiento y egress, latencia, URLs inmutables por versión o hash, invalidación, disponibilidad y operación desde Railway, y el motivo de la elección y de cada descarte.

### REQ-02 `inferred`
> Fuente: Request del ticket TAO-195 (EP-02 HU-02-01), Alcance: 'Medición con una muestra de derivados WebP de cada familia' y Criterio de aceptación 2; pedido de enmienda punto 5

La DEC declara en MB el presupuesto del binario para iOS y para Android y el peso estimado del conjunto descargable, con un método de estimación reproducible: una tabla de mediciones de una muestra de derivados WebP de cada familia de app/assets/ (123 PNG, unos 342 MB), extrapolada al total. Si la herramienta y la calidad WebP usadas en las pruebas de content/imagenes/12 no están documentadas, la DEC declara la herramienta y la calidad elegidas como parte del método reproducible.

### REQ-03 `inferred`
> Fuente: taomangalam/docs/backlog/EP-02_contenido_empaquetado_y_assets.md:122

La DEC fija la regla esencial (empaquetado) o descargable por familia de asset, a partir de DEC-173 (identidad, iconos y láminas base del primer uso). Esa regla permite el primer uso sin red y el conjunto descargable es compatible con los topes de DEC-202 (1 GB en teléfono, 2 GB en tablet, reserva de 1 GB).

### REQ-04 `inferred`
> Fuente: taomangalam/docs/backlog/EP-02_contenido_empaquetado_y_assets.md:122

La DEC define cómo se versionan las URLs (inmutables por versión o hash, para que los builds anteriores sigan descargando su versión), cómo se publica el SHA-256 de cada derivado, cómo conoce la app la lista de descargables (manifiesto en el binario o endpoint, con el cambio de contrato indicado si es endpoint), si la lectura es pública o requiere credencial (sin paquetes por capacidad, DEC-223), que ninguna URL incluye datos de la persona y qué métricas agregadas de descarga se registran, sin nombres de archivo por persona (DEC-202).

### REQ-05 `inferred`
> Fuente: Request del ticket TAO-195 (EP-02 HU-02-01), sección Criterios de aceptación: línea 'Dado el prototipo, cuando descarga un derivado íntegro, entonces verifica su SHA-256; cuando el archivo está alterado, entonces lo rechaza' y caso QA-02-01-02

Un prototipo descartable, dentro de la suite de tests, sirve un derivado fixture desde un HttpServer local (dart:io), lo descarga por HTTP y verifica su SHA-256: acepta el archivo íntegro y rechaza el alterado (un byte cambiado) por hash distinto. La suite 'flutter test' completa no depende de la red ni del origen evaluado; si se quiere probar contra el origen real, es un caso opcional excluido por tag o variable de entorno. El build productivo no depende del prototipo ni del origen evaluado.

### REQ-06 `inferred`
> Fuente: taomangalam/docs/backlog/EP-02_contenido_empaquetado_y_assets.md:145

Al cerrar el spike se actualizan doc 47 (sección 5), doc 42 (sección 4.4) y las historias HU-02-02, HU-02-09 y HU-02-15 del backlog EP-02 para enlazar la DEC y reflejar el origen, los presupuestos y la regla esencial o descargable.

### REQ-07 `confirmed` `enforcement`
> Fuente: taomangalam/app/test/core/images/image_manifest_test.dart:111

El prototipo reusa el patrón existente de verificación SHA-256 con package:crypto de empaquetado_test.dart y no lee app/assets/manifest.json fuera de la interfaz ImageManifest.
## Tasks

#### S1.T1 — Revisar lo que dejó TAO-190 sesión 1 (git show --stat 8e45d4d) para HU-02-01: DEC, tabla de mediciones y prototipo. Decidir qué se reusa y qué falta, sin duplicar la DEC. Después medir una muestra de derivados WebP por familia de app/assets/ (123 PNG, unos 342 MB), tomando como referencia la reducción de 85 % a 91 % de content/imagenes/12, y armar la tabla reproducible con el método de extrapolación y las cifras en MB del binario iOS, del binario Android y del conjunto descargable.
Contrato: rollback: Revertir el commit de la tabla de mediciones. Los maestros de app/assets/ no se modifican.. Status: pending

#### S1.T2 — Comparar al menos dos alternativas de origen (almacenamiento de objetos solo y con CDN delante) por costo de almacenamiento y egress, latencia, URLs inmutables por versión o hash, invalidación, disponibilidad y operación desde Railway, y dejar la tabla en el borrador de la DEC con el origen recomendado.
Contrato: rollback: Revertir el commit del borrador de la DEC.. Status: pending

#### S1.T3 — Prototipo descartable en app/test: servir el derivado fixture desde un HttpServer local (dart:io) levantado dentro del test, descargarlo por HTTP y verificar su SHA-256 (reusando el patrón con package:crypto de empaquetado_test.dart); comprobar que el archivo con un byte alterado se rechaza por hash distinto. Es la única vía del prototipo: no se descarga del origen evaluado en la suite. Si se quiere probar contra el origen real, es un caso opcional excluido por tag o variable de entorno, para que 'flutter test' completo no dependa de la red ni del origen (rollback del request).
Contrato: rollback: Borrar el archivo del prototipo. Nada de app/lib/ lo referencia.. Status: pending

#### S1.T4 — Tests del prototipo: [happy] el derivado íntegro se acepta; [error] QA-02-01-02, el derivado con un byte cambiado se rechaza informando el hash esperado y el obtenido; [edge] el archivo truncado se rechaza. Regresión: correr image_manifest_test.dart para confirmar que nada lee app/assets/manifest.json fuera de la interfaz.
Contrato: rollback: Borrar los casos agregados.. Status: pending

#### S2.T1 — Cerrar la DEC: origen elegido y descartes con motivo; regla esencial o descargable por familia a partir de DEC-173, que permita el primer uso sin red, con la cuenta frente a DEC-202 (1 GB en teléfono, 2 GB en tablet, reserva de 1 GB); patrón de URL inmutable por versión o hash; publicación del SHA-256 (manifiesto en el binario o endpoint, con el cambio de contrato indicado si es endpoint); lectura pública o con credencial (sin paquetes por capacidad, DEC-223); URLs sin datos de la persona; y métricas agregadas de descarga sin nombres de archivo por persona.
Contrato: rollback: Revertir el commit de la DEC. La tabla de mediciones y la evidencia se conservan.. Status: pending

#### S2.T2 — Actualizar doc 47 (sección 5), doc 42 (sección 4.4) y las historias HU-02-02, HU-02-09 y HU-02-15 de docs/backlog/EP-02_contenido_empaquetado_y_assets.md para enlazar la DEC nueva. HU-02-15 conserva los topes de DEC-202.
Contrato: rollback: Revertir el commit de los documentos. Si la decisión cambia, actualizar primero los tickets consumidores.. Status: pending

#### S2.T3 — Regresión del spike: revisar la DEC con la lista QA-02-01-01 (origen, presupuestos en MB, regla esencial o descargable, versionado de URLs y verificación por hash), confirmar que app/lib/ y app/pubspec.yaml no referencian el prototipo ni el origen y volver a correr el test del prototipo.
Contrato: rollback: No aplica: solo verifica.. Status: pending

#### S2.T4 — Cierre del spike: dejar la DEC enlazada para el issue GH-69 (https://github.com/edobacon/taomangalam/issues/69), preparando el texto del comentario con el enlace a la DEC y a la tabla de mediciones. Publicar el comentario en GitHub es una acción externa que confirma el dev; la ejecución NO lo publica, solo deja el texto listo y lo indica en el reporte.
Contrato: rollback: Descartar el texto preparado del comentario; no hay nada publicado en GitHub que revertir.. Status: pending

#### S2.T5 — Demostrar que el build no depende del origen evaluado: obtener el host o dominio del origen elegido en la DEC y ejecutar un grep de ese host/dominio sobre app/lib, app/pubspec.yaml y el resto del build (por ejemplo app/android, app/ios y los scripts de build), esperando cero coincidencias. Complementa el grep de 'hu_02_01' en app/lib y app/pubspec.yaml.
Contrato: rollback: Solo lectura: no requiere rollback; si hay coincidencias, retirar la referencia al origen del build antes de cerrar.. Status: pending
## Cambios al modelo de datos

Ninguno.

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-05 (edit) `inferred`: Un prototipo descartable, dentro de la suite de tests, sirve un derivado fixture desde un HttpServer local (dart:io), lo descarga por HTTP y
- REQ-02 (edit) `inferred`: La DEC declara en MB el presupuesto del binario para iOS y para Android y el peso estimado del conjunto descargable, con un método de estima

**Tasks agregadas:**

- S2: Cierre del spike: dejar la DEC enlazada para el issue GH-69 (https://github.com/edobacon/taomangalam/issues/69), preparando el texto del comentario con el enlace a la DEC y a la tabla de mediciones. Publicar el comentario en GitHub es una acción externa que confirma el dev; la ejecución NO lo publica, solo deja el texto listo y lo indica en el reporte. (valida: REQ-01, REQ-06; rollback: Descartar el texto preparado del comentario; no hay nada publicado en GitHub que revertir.)
- S2: Demostrar que el build no depende del origen evaluado: obtener el host o dominio del origen elegido en la DEC y ejecutar un grep de ese host/dominio sobre app/lib, app/pubspec.yaml y el resto del build (por ejemplo app/android, app/ios y los scripts de build), esperando cero coincidencias. Complementa el grep de 'hu_02_01' en app/lib y app/pubspec.yaml. (valida: REQ-05; rollback: Solo lectura: no requiere rollback; si hay coincidencias, retirar la referencia al origen del build antes de cerrar.)

**Task ops:**

- edit S1.T3 { desc="Prototipo descartable en app/test: servir el derivado fixture desde un HttpServer local (dart:io) levantado dentro del test, descargarlo por HTTP y verificar su SHA-256 (reusando el patrón con package:crypto de empaquetado_test.dart); comprobar que el archivo con un byte alterado se rechaza por hash distinto. Es la única vía del prototipo: no se descarga del origen evaluado en la suite. Si se quiere probar contra el origen real, es un caso opcional excluido por tag o variable de entorno, para que 'flutter test' completo no dependa de la red ni del origen (rollback del request).", validates=["REQ-05","REQ-07"], isTest=true }

## Sessions

### Session 1 · T2 · open

**Tasks:**
- [ ] S1.T1
- [ ] S1.T2
- [ ] S1.T3
- [ ] S1.T4

**Gate (auto)**: La tabla de mediciones por familia y la comparación de alternativas quedan en el borrador de la DEC, y el test del prototipo pasa en app/ con el caso íntegro aceptado y el alterado rechazado.

### Session 2 · T1 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T2
- [ ] S2.T3
- [ ] S2.T4
- [ ] S2.T5

**Gate (auto)**: La DEC final queda en docs/product/decisiones/ y cumple todos los puntos de QA-02-01-01. Doc 47 §5, doc 42 §4.4 y HU-02-02, HU-02-09 y HU-02-15 la enlazan.

