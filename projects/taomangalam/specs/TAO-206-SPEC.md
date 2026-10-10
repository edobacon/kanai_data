---
id: TAO-206-SPEC
project: taomangalam
ticket: TAO-206
status: approved
---

# HU-02-11 Catálogo versionado de los 22 arcanos y esquema editorial de Acerca de e Instructivo, trazados a la fuente

## Resumen ejecutivo

Se entrega el catálogo versionado de los 22 arcanos (ids 0 a 21, alias 22 solo en El Loco, orden Rider-Waite con 8 = La Fuerza y 11 = La Justicia, sin campo de interpretación). Lo acompañan su generador, su JSON Schema, el --check, la copia a app/assets/catalogos/ y un cargador Dart, siguiendo el patrón de HU-02-04 (TAO-198). Se agregan también el esquema editorial común de Acerca de y del Instructivo y un validador que falla ante referencias rotas a catálogos, al glosario o al manifiesto, nombrando el apartado y la clave.
NO incluye: los textos del glosario (HU-10-01), de Acerca de (HU-10-03) ni de los capítulos (HU-10-04), el marcado de términos (HU-10-02), los derivados de las láminas (HU-02-12) ni ninguna interfaz de EP-10. El validador editorial se prueba con fixtures porque esos contenidos todavía no existen.
Se sabe que funciona cuando el generador y las pruebas terminan sin errores con 22 arcanos (QA-02-11-01), cuando un catálogo de prueba con El Loco como id 22 falla nombrando el arcano (QA-02-11-02), cuando un capítulo de prueba con un procedimiento inexistente falla nombrando el capítulo y la clave (QA-02-11-03), cuando el --check corre en el job docs de CI y cuando el test Dart recibe los arcanos ordenados con content_key y content_version.
Tamaño: 2 sesiones T2 (aprox. 5 puntos). No toca la DB: los catálogos son JSON empaquetado en la app, así que dataModelChanges queda vacío.
ADVERTENCIA: la coherencia con las casas depende del catálogo de HU-02-05 (bloqueante). Si no está integrado en origin/main, la sesión 1 no puede cerrar el criterio de coherencia.

Datos a confirmar antes de ejecutar:
- Ruta y forma del catálogo de casas de HU-02-05 (archivo JSON y campos de nombre y palabra mágica por arcano): confirmar en origin/main o en el spec de HU-02-05.
- Ruta del manifiesto v2 de assets (TAO-196) y forma del id de cada lámina de arcano: confirmar en el spec de TAO-196 y en el manifiesto.
- Nombres exactos de los archivos del patrón de TAO-198 (scripts/build_result_catalog.py, su schema, sus tests y el cargador Dart con su test) para copiar la convención de nombres y ubicación: confirmar en el repo.
- Claves de bloque de HU-10-15 para Acerca de y los nueve capítulos de V-46: confirmar en el backlog EP-10.
- Comando del linter de docs que aplica .docs-baseline.txt (se asume pnpm exec markdownlint-cli2 y vale): confirmar en ci-pr.yml, en el job docs.

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-02_contenido_empaquetado_y_assets.md:640

Un generador produce el catálogo versionado de los 22 arcanos validado contra su JSON Schema. Cada arcano (id 0 a 21, content_key estable por número) trae número, nombre de la lista canónica de docs/content/imagenes/01_arcanos.md, alias 22 solo en El Loco, palabra mágica con sourceRefs al párrafo de la casa que la declara, casa(s), invitación al contacto intuitivo (tm-src-tablero#p0128) e id de su lámina. Usa el orden Rider-Waite (8 = La Fuerza, 11 = La Justicia) y el esquema rechaza cualquier campo de interpretación (DEC-048).

### REQ-02 `confirmed`
> Fuente: adenda 2 del request, corrección (g); adenda 1, puntos 3 y 4

El validador del catálogo comprueba el reparto y la coherencia cruzada. Cada arcano pertenece a exactamente una casa y la Casa 2 tiene los arcanos 2 y 12. Para cada arcano asociado a una casa, el nombre y la palabra mágica coinciden con docs/content/catalogos/casas.v1.json (HU-02-05; cada casa trae id, contentKey, name y arcana), y el id de su lámina existe en app/assets/manifest.json (inventario de TAO-190). Estas comprobaciones de casas y manifiesto viven en un único lugar y se reutilizan: el generador (scripts/build_arcanos_catalog.py) y el validador editorial (scripts/validate_editorial_catalog.py) no las duplican, uno invoca la función del otro o ambos importan una utilidad común de scripts/catalog_common.py. Ante una falla, CI nombra el nodo o la referencia rota.

### REQ-03 `confirmed`
> Fuente: Adenda 3 puntos 1 a 3

Un JSON Schema editorial común modela Acerca de (bloques que reutilizan las claves de HU-10-15) y el Instructivo (los nueve capítulos de V-46 con apartados). Tanto Acerca de como el Instructivo llevan un campo catalogVersion (content_version) obligatorio, porque EP-10 guarda esa versión en estado_onboarding (tecnologia/20); un test lo exige. Las claves de bloque y de capítulo se validan con un patrón de contentKey en minúsculas con guiones (^[a-z0-9]+(-[a-z0-9]+)*$), no con un enum, y los catálogos reales generados (REQ-11 y REQ-12) usan las claves de la Adenda 2 (bloques intro-no-es-oraculo, intro-cada-proyecto-es-un-viaje, intro-participacion-activa, intro-metodo-fisico, intro-que-es-tao-mangalam, intro-para-que-sirve, intro-elementos-fisicos e intro-recorrido; capítulos instructivo-cap-01 a instructivo-cap-09 con los títulos de HU-10-04). Cada apartado lleva content_key, texto y fuente, y puede referenciar por content_key un procedimiento, un término del glosario y una ilustración del manifiesto por id. Los procedimientos se resuelven por contentKey contra una lista EXPLÍCITA de catálogos de procedimientos (docs/content/catalogos/ritual_sesion.v1.json, más practica.v1.json cuando exista), nunca contra un glob. Los términos se resuelven contra el glosario real docs/content/catalogos/glosario.v1.json por su campo contentKey. El validador (scripts/validate_editorial_catalog.py) falla ante cualquier referencia rota nombrando el apartado o capítulo y la clave.

### REQ-04 `confirmed`
> Fuente: Adenda 1 punto 7 y pedido de enmienda: regresión de generadores existentes

El catálogo de arcanos expone catalogVersion como content_version. La copia a app/assets/catalogos/ se registra en scripts/sync_app_catalogs.py; el generador (scripts/build_arcanos_catalog.py) no copia por sí mismo. Su --check corre en el job docs de CI (paso Gates de build documental (--check) de .github/workflows/ci-pr.yml). El mecanismo de detección es un hash del contenido versionado almacenado junto al catálogo, como el de los catálogos existentes (scripts/catalog_common.py): --check falla si el JSON generado o la copia difieren de lo versionado, y en particular si cambia el contenido (por ejemplo el nombre de un arcano) sin subir catalogVersion.

### REQ-05 `inferred`
> Fuente: Pedido de cambio, punto 6

Un cargador Dart de solo lectura lee el catálogo empaquetado en app/assets/catalogos/arcanos.v1.json y entrega los arcanos ordenados por número con su content_key, número y nombre (disponibles para el texto alternativo de la lámina) y el content_version del catálogo, sin red. El archivo del cargador vive junto al cargador de resultados de TAO-198; la ruta real se confirma con Glob en app/lib antes de crearlo.

### REQ-06 `confirmed`
> Fuente: Adenda 2 correcciones (b) y (d)

El generador se llama scripts/build_arcanos_catalog.py (nombre único en spec, sesiones y reviewOutcome). Con su --check, el schema y el cargador Dart siguen el patrón de scripts/build_house_catalog.py y scripts/catalog_common.py y de HU-02-04 (TAO-198). Se reutilizan esas utilidades en vez de crear un mecanismo paralelo. La copia a app/assets/catalogos/ se registra en scripts/sync_app_catalogs.py. scripts/build_result_catalog.py no se toma como patrón; solo se mantiene su --check como regresión. El reviewOutcome del gate de la sesión 1 incluye las suites tests/test_catalogo_arcanos.py y tests/test_arcanos_correcciones_editoriales.py.

### REQ-07 `confirmed` `variant`
> Fuente: sonda:card-docs-de-superficie-6c8ae176a6

docs/development/commands.md documenta el comando del generador del catálogo de arcanos y su --check, y los de los generadores nuevos (scripts/build_glosario_catalog.py y scripts/build_acerca_instructivo_catalog.py, cada uno con su --check), con uso, parámetros y ejemplo, siguiendo el patrón de los generadores de TAO-198 y TAO-199.

### REQ-08 `confirmed` `variant`
> Fuente: sonda:card-lint-de-docs-4d9deffd06

Todo doc de .docs-baseline.txt (una ruta por línea, # para comentarios) que el ticket modifique, incluidos docs/content/imagenes/01_arcanos.md y docs/content/SCHEMA.md, queda compliant con el linter de docs y se normaliza el patrón que el linter rechaza. La normalización de formato de 01_arcanos.md tiene un solo dueño (S1.T2) y la sección del esquema editorial y de arcanos en docs/content/SCHEMA.md se escribe en una tarea de S2. Las correcciones de contenido de nombres o palabras mágicas no se hacen en 01_arcanos.md: van en correcciones_editoriales_arcanos.v1.json (REQ-09). El comando de verificación en todos los verify y casos de test es DOCS_DIFF_BASE=origin/main node scripts/dev/docs.mjs check (job docs de .github/workflows/ci-pr.yml), no markdownlint-cli2, para que el job docs y quality-gate no queden rojos.

### REQ-09 `confirmed`
> Fuente: Adenda 1 punto 8

Las correcciones editoriales de nombres o palabras mágicas entre docs/content/imagenes/01_arcanos.md y las casas se registran en docs/content/catalogos/correcciones_editoriales_arcanos.v1.json, con el patrón de los demás correcciones_editoriales_*.v1.json, y el generador las aplica y deja trazadas. Una discrepancia no registrada hace fallar el generador nombrando el arcano, y el archivo de correcciones valida contra la misma forma que los demás correcciones_editoriales_*.v1.json. La suite tests/test_arcanos_correcciones_editoriales.py valida este requisito y forma parte del reviewOutcome del gate de la sesión 1.

### REQ-10 `confirmed`
> Fuente: Adenda 3 punto 1

Un generador scripts/build_glosario_catalog.py (con --check y el patrón de scripts/catalog_common.py) produce docs/content/catalogos/glosario.v1.json desde los 16 términos de docs/content/10_registro_cierre_y_glosario.md: Anillo, Ashura, Campanilla, Casa o reino, Chakras, Coherencia vibracional, Corrector energético, Dados, Dharani Deva, Flujo energético, Kipot, Kuberani, Péndulo, Registro, Rhibu y Sentencia de Tao. Por término: contentKey estable en minúsculas con guiones (el ancla del documento), término canónico, definición breve, tags del front matter del documento, text, sourceText y sourceRefs a los párrafos citados de docs/content/fuentes/02_como_usar_tao_mangalam.md (con editorialResolutionId si el texto difiere). La explicación ampliada, sinónimos, relacionados y contextos no existen en la documentación: se omiten y nunca aparecen como null. Incluye su JSON Schema, catalogVersion con hash del contenido y docs/content/catalogos/correcciones_editoriales_glosario.v1.json con el patrón de los demás correcciones_editoriales_*.v1.json.

### REQ-11 `confirmed`
> Fuente: Adenda 3 punto 2

Un generador (scripts/build_acerca_instructivo_catalog.py, que reutiliza scripts/catalog_common.py sin duplicar su lógica) produce el catálogo de bloques de la introducción y de Acerca de desde docs/content/fuentes/01_que_es_tao_mangalam.md con los ocho bloques de la Adenda 2 (intro-no-es-oraculo, intro-cada-proyecto-es-un-viaje, intro-participacion-activa, intro-metodo-fisico, intro-que-es-tao-mangalam, intro-para-que-sirve, intro-elementos-fisicos e intro-recorrido). Cada bloque trae texto, fuente trazable y la marca provisional hasta la aprobación editorial de Contenido (DEC-082: sin origen, autoría ni créditos).

### REQ-12 `confirmed`
> Fuente: Adenda 3 punto 3

El mismo generador produce el catálogo de los nueve capítulos del Instructivo (instructivo-cap-01 a instructivo-cap-09) con los títulos de HU-10-04 de docs/backlog/EP-10_biblioteca_ayuda_y_aprendizaje.md (1 preparación y elementos físicos; 2 persona, personalidad y creación de una consulta; 3 tablero y comienzo en Casa 1; 4 ritual de preparación; 5 tirada física y registro de D12, D8 y D4; 6 Avance, Permanencia, Retroceso y Cierre; 7 Casas, anillos, prácticas y reparación; 8 tareas, cumplimiento y siguiente tirada; 9 historial, respaldo y recuperación del trabajo). Los apartados referencian por content_key los procedimientos de ritual_sesion.v1.json y, cuando exista, de practica.v1.json, validados contra los catálogos reales sin copiarlos. El texto de cada apartado se redacta solo con lo que HU-10-04 y las fuentes declaran; lo no declarado se omite y queda marcado provisional.

### REQ-13 `confirmed`
> Fuente: Adenda 4 puntos 4 y 6; Adenda 2 (g); pedido de cambio puntos 4 y 5

El validador de referencias (scripts/validate_editorial_catalog.py) valida SOLO tres tipos de referencia: ilustraciones contra app/assets/manifest.json, términos contra docs/content/catalogos/glosario.v1.json (campo contentKey) y procedimientos contra la lista explícita ritual_sesion.v1.json (más practica.v1.json si existe). No valida casas ni nombres o palabras mágicas de arcanos (eso vive en el generador, REQ-02). El caso válido corre contra los catálogos reales; los fixtures se usan solo para los casos de error (término, procedimiento o ilustración inexistentes). Ante cada falla nombra el capítulo o apartado y la clave rota.

### REQ-14 `confirmed`
> Fuente: Adenda 3 punto 5

Los tres catálogos nuevos (glosario.v1.json, el de Acerca de y el del Instructivo) se copian a app/assets/catalogos/ registrándolos en scripts/sync_app_catalogs.py, y un cargador Dart de solo lectura por catálogo, junto al cargador de arcanos (ruta confirmada con Glob en app/lib), los lee sin red y entrega sus nodos con content_key y content_version.

### REQ-15 `confirmed`
> Fuente: Adenda 3 punto 5 y pedido de cambio (6)

El job docs de CI (paso Gates de build documental (--check) de .github/workflows/ci-pr.yml) corre el --check de scripts/build_glosario_catalog.py y de scripts/build_acerca_instructivo_catalog.py junto con los generadores existentes.

### REQ-16 `confirmed`
> Fuente: Adenda 4 puntos 1 y 2; Adenda 3 punto 4

Lo que no se puede generar desde la documentación queda marcado provisional. El esquema editorial común define el campo opcional editorialStatus con el único valor "provisional" por nodo; un nodo aprobado no lo lleva. La aprobación editorial se registra en la lista approvals de docs/content/catalogos/correcciones_editoriales_<catálogo>.v1.json con {nodeKeys o "all", approvedBy, approvedAt, reference}. El generador quita editorialStatus de los nodos cubiertos por una aprobación; sin aprobación el nodo sale "provisional". El generador nunca levanta la marca por sí mismo y el catálogo generado no guarda nombres de personas (approvedBy vive solo en el archivo de correcciones). Aplica a glosario, Acerca de e Instructivo.
## Tasks

#### S1.T1 — Implementar el generador scripts/build_arcanos_catalog.py y su --check, con el patrón de scripts/build_house_catalog.py y scripts/catalog_common.py (no build_result_catalog.py). Salidas: docs/content/catalogos/arcanos.v1.json y docs/content/catalogos/arcanos.v1.schema.json (22 arcanos, ids 0 a 21, alias 22 solo en El Loco, sin campos de interpretación). Aplica las correcciones de docs/content/catalogos/correcciones_editoriales_arcanos.v1.json. Esta task no toca ci-pr.yml ni docs/development/commands.md (van en S1.T3).
Contrato: rollback: Eliminar scripts/build_arcanos_catalog.py, docs/content/catalogos/arcanos.v1.json y docs/content/catalogos/arcanos.v1.schema.json; el resto del repo no cambia.. Status: done

#### S1.T1.1 — Schema JSON de arcanos con additionalProperties:false, ids 0..21, alias opcional con valor constante 22, sourceRefs obligatorios en la palabra mágica, invitación y id de lámina.
Contrato: rollback: Borrar el archivo de schema.. Status: done

#### S1.T1.2 — Reutilizar scripts/catalog_common.py y el patrón de scripts/build_house_catalog.py para el hash de contenido, la escritura determinista y el modo --check. No tomar scripts/build_result_catalog.py como patrón.
Contrato: rollback: Borrar el script y los JSON generados.. Status: done

#### S1.T1.3 — Implementar UNA sola vez, como funciones reutilizables en scripts/catalog_common.py, la validación de coherencia con docs/content/catalogos/casas.v1.json (nombre y palabra mágica por arcano asociado a una casa; reparto de una casa por arcano, Casa 2 con arcanos 2 y 12) y la validación de existencia del id de lámina en app/assets/manifest.json. El generador y scripts/validate_editorial_catalog.py solo las invocan.
Contrato: rollback: Revertir los cambios en scripts/catalog_common.py (la utilidad común de comprobación de casas y manifiesto); los generadores existentes siguen usando sus versiones previas.. Status: done

#### S1.T2 — Mantener lo ya descrito. Esta tarea es el único dueño de la normalización de formato de docs/content/imagenes/01_arcanos.md para el linter (sin cambios de contenido; las correcciones van en correcciones_editoriales_arcanos.v1.json). Verificar con DOCS_DIFF_BASE=origin/main node scripts/dev/docs.mjs check.
Contrato: rollback: git checkout -- docs/content/imagenes/01_arcanos.md y de los demás docs normalizados; revertir también su línea en .docs-baseline.txt si se quitó.. Status: done

#### S1.T3 — Integración en CI y documentación, sin lógica del generador. (1) Agregar python3 scripts/build_arcanos_catalog.py --check al paso Gates de build documental (--check) del job docs de .github/workflows/ci-pr.yml, localizándolo por nombre. (2) Escribir en docs/development/commands.md la entrada del generador build_arcanos_catalog.py con su uso, la opción --check y un ejemplo, siguiendo el patrón de las entradas de TAO-198 y TAO-199. Valida REQ-04 y REQ-07. S1.T1 conserva la implementación del generador y del schema.
Contrato: rollback: Quitar la línea del --check de arcanos en .github/workflows/ci-pr.yml y la entrada de build_arcanos_catalog.py en docs/development/commands.md.. Status: done

#### S1.T4 — Mantener lo ya descrito y reincorporar estos casos en tests/test_catalogo_arcanos.py: QA-02-11-02 (El Loco con id 22 en un catálogo de prueba hace fallar el validador nombrando El Loco); el esquema rechaza un campo de interpretación agregado a un arcano (DEC-048); arcano 8 = La Fuerza con «audacia, fuerza» y arcano 11 = La Justicia con «sabiduría social. El afán debe ser justo»; El Loco tiene número 0, alias 22 y pertenece a la Casa 12, y ningún otro arcano tiene alias. Esta tarea es la que ejecuta el verify de test_catalogo_arcanos.py, que corre después de S1.T1 y S1.T5.
Contrato: rollback: Eliminar tests/test_catalogo_arcanos.py; no hay otros efectos.. Status: done

#### S1.T5 — Mantener lo ya descrito. Esta tarea es el único dueño del hash de catalogVersion: hash del contenido versionado almacenado junto al catálogo, con las utilidades de scripts/catalog_common.py. Su verify de test_catalogo_arcanos.py se ejecuta en S1.T4, no aquí.
Contrato: rollback: Revertir el registro de arcanos en scripts/sync_app_catalogs.py, eliminar la copia en app/assets/catalogos/ y el hash almacenado junto a docs/content/catalogos/arcanos.v1.json.. Status: done

#### S2.T1 — Crear el esquema editorial común docs/content/catalogos/editorial.v1.schema.json para Acerca de (bloques con claves de HU-10-15) e Instructivo (nueve capítulos de V-46 con apartados), con catalogVersion obligatorio y claves validadas por el patrón ^[a-z0-9]+(-[a-z0-9]+)*$, no por enum. Cada apartado lleva content_key, texto y fuente, y puede referenciar procedimiento, término del glosario e ilustración del manifiesto. Se prueba solo con fixtures en tests/fixtures/editorial/.
Contrato: rollback: Eliminar docs/content/catalogos/editorial.v1.schema.json y los fixtures en tests/fixtures/editorial/.. Status: done

#### S2.T2 — Cargador Dart de solo lectura del catálogo de arcanos (mismo patrón y ubicación que el cargador de resultados de TAO-198). Lee el asset desde app/assets/catalogos/, ordena por número y expone content_key, número, nombre, alias y content_version (= catalogVersion). Lanza un error tipado si falta la versión. Registrar el asset en pubspec.yaml si el patrón lo exige.
Contrato: rollback: Borrar el cargador y revertir el registro del asset en pubspec.yaml.. Status: done

#### S2.T3 — Escribir la única suite del esquema editorial y su validador, tests/test_catalogo_editorial.py (absorbe lo que antes estaba en S2.T6). Cubre: esquema de Acerca de e Instructivo con fixtures; catalogVersion (content_version) obligatorio en ambos, con un test que falla si falta; patrón de claves ^[a-z0-9]+(-[a-z0-9]+)*$ con un caso que lo viola y se rechaza; referencias rotas a procedimientos (lista explícita de catálogos), glosario (docs/content/catalogos/glosario.v1.json, campo contentKey) e ilustraciones del manifiesto, con falla que nombra el apartado o capítulo y la clave (QA-02-11-03). No incluye QA-02-11-02, que vive en la suite de arcanos de S1.T4.
Contrato: rollback: Eliminar tests/test_catalogo_editorial.py; el esquema y el validador quedan intactos.. Status: done

#### S2.T4 — Implementar scripts/validate_editorial_catalog.py. Resuelve procedimientos por contentKey contra una lista explícita de catálogos de procedimientos (hoy docs/content/catalogos/ritual_sesion.v1.json, más el catálogo de TAO-207 cuando exista), no un glob. Las validaciones de casas y manifiesto solo se invocan desde las funciones de scripts/catalog_common.py definidas en S1.T1.3, sin reimplementarlas.
Contrato: rollback: Revertir solo scripts/validate_editorial_catalog.py y su test (git checkout de esos archivos); no tocar la normalización de docs (S1.T2) ni el hash de catalogVersion (S1.T5).. Status: done

#### S2.T8 — Escribir app/test/catalogos/arcanos_catalog_test.dart para el cargador Dart de arcanos (confirmar con Glob que la ruta queda junto al test del cargador de resultados de TAO-198). Casos: el catálogo empaquetado entrega 22 arcanos ordenados 0..21, cada uno con content_key, y content_version igual a catalogVersion; un asset con arcanos desordenados se entrega ordenado por número; El Loco tiene número 0 y alias 22; un asset sin catalogVersion lanza un error tipado. Las assertions usan valores concretos.
Contrato: rollback: Eliminar app/test/catalogos/arcanos_catalog_test.dart; el cargador y el catálogo quedan intactos.. Status: done

#### S2.T9 — Escribir en docs/content/SCHEMA.md la sección del esquema editorial (Acerca de e Instructivo) y del catálogo de arcanos: campos, patrón de contentKey ^[a-z0-9]+(-[a-z0-9]+)*$, catalogVersion como content_version, referencias a procedimientos, glosario y manifiesto, y rechazo de campos de interpretación (DEC-048). Dejar el doc compliant con el linter de docs.
Contrato: rollback: Revertir solo la sección agregada a docs/content/SCHEMA.md con git checkout del archivo.. Status: done

#### S3.T1 — Crear docs/content/catalogos/correcciones_editoriales_arcanos.v1.json con el patrón de los demás correcciones_editoriales_*.v1.json, y hacer que scripts/build_arcanos_catalog.py aplique esas correcciones para reconciliar nombres o palabras mágicas entre docs/content/imagenes/01_arcanos.md y docs/content/catalogos/casas.v1.json.
Contrato: rollback: Borrar correcciones_editoriales_arcanos.v1.json y revertir la lectura de correcciones en el generador.. Status: pending

#### S3.T2 — Mantener lo ya descrito y sumar los dos casos vinculantes de REQ-09 en tests/test_arcanos_correcciones_editoriales.py: una discrepancia de nombre o palabra mágica no registrada hace fallar scripts/build_arcanos_catalog.py nombrando el arcano, y docs/content/catalogos/correcciones_editoriales_arcanos.v1.json valida contra la misma forma que los demás correcciones_editoriales_*.v1.json.
Contrato: rollback: Eliminar tests/test_arcanos_correcciones_editoriales.py.. Status: pending

#### S3.T3 — Crear docs/content/catalogos/correcciones_editoriales_arcanos.v1.json con la misma forma que los demás correcciones_editoriales_*.v1.json y aplicarlo en scripts/build_arcanos_catalog.py: las correcciones registradas se aplican y quedan trazadas en el catálogo; una discrepancia de nombre o palabra mágica entre 01_arcanos.md y casas.v1.json no registrada hace fallar el generador nombrando el arcano. Reutilizar scripts/catalog_common.py.
Contrato: rollback: Revertir el commit: eliminar correcciones_editoriales_arcanos.v1.json y la lógica de correcciones en scripts/build_arcanos_catalog.py; el catálogo vuelve a generarse sin correcciones.. Status: pending

#### S3.T4 — Escribir tests/test_arcanos_correcciones_editoriales.py: (a) el archivo correcciones_editoriales_arcanos.v1.json valida contra la misma forma que los demás correcciones_editoriales_*.v1.json; (b) una discrepancia no registrada hace fallar el generador nombrando el arcano; (c) una corrección registrada se aplica y queda trazada.
Contrato: rollback: Eliminar tests/test_arcanos_correcciones_editoriales.py.. Status: pending

#### S4.T1 — Crear scripts/build_glosario_catalog.py con --check (patrón de scripts/catalog_common.py y scripts/build_house_catalog.py), el JSON Schema del glosario y docs/content/catalogos/correcciones_editoriales_glosario.v1.json. Generar docs/content/catalogos/glosario.v1.json desde los 16 términos de docs/content/10_registro_cierre_y_glosario.md: contentKey (ancla), término, definición breve, tags del front matter, text, sourceText, sourceRefs a docs/content/fuentes/02_como_usar_tao_mangalam.md y editorialResolutionId si el texto difiere. Omitir explicación ampliada, sinónimos, relacionados y contextos (sin null). catalogVersion con hash del contenido versionado almacenado junto al catálogo, marca provisional.
Contrato: rollback: Eliminar scripts/build_glosario_catalog.py, el schema, correcciones_editoriales_glosario.v1.json y glosario.v1.json; no se tocan otros catálogos.. Status: done

#### S4.T2 — Escribir tests/test_catalogo_glosario.py (16 términos y contentKey exactas, claves opcionales ausentes y nunca null, sourceRefs resolubles, marca provisional, cambio de contenido sin subir catalogVersion falla --check) y tests/test_glosario_correcciones_editoriales.py (forma igual a los demás correcciones_editoriales_*.v1.json y discrepancia no registrada falla nombrando el término).
Contrato: rollback: Eliminar los dos archivos de test nuevos.. Status: done

#### S4.T3 — Verificar el linter de docs sobre los docs tocados por el ticket (docs/content/imagenes/01_arcanos.md, docs/content/SCHEMA.md y docs/development/commands.md): normalizar el patrón que el linter rechaza y confirmar compliance con el comando DOCS_DIFF_BASE=origin/main node scripts/dev/docs.mjs check, con .docs-baseline.txt como baseline (una ruta por línea, # para comentarios).
Contrato: rollback: Revertir los cambios de formato en los docs con git checkout de esos archivos.. Status: done

#### S5.T1 — Extender el JSON Schema editorial común ya definido para Acerca de e Instructivo con los campos de los catálogos nuevos (glosario, bloques de Acerca de, capítulos con apartados) y el campo opcional editorialStatus con valor "provisional" por nodo. No crear un esquema paralelo: los esquemas de glosario.v1.json, acerca_de.v1.json e instructivo.v1.json referencian/extienden el común. Mantener el patrón de contentKey ^[a-z0-9]+(-[a-z0-9]+)*$ y catalogVersion obligatorio.
Contrato: rollback: Eliminar scripts/build_acerca_instructivo_catalog.py, el schema editorial y acerca_de.v1.json.. Status: done

#### S5.T2 — Extender scripts/build_acerca_instructivo_catalog.py para generar docs/content/catalogos/instructivo.v1.json: nueve capítulos instructivo-cap-01 a instructivo-cap-09 con los títulos de HU-10-04 (docs/backlog/EP-10_biblioteca_ayuda_y_aprendizaje.md, desde la línea 613), apartados con content_key, texto y fuente, y referencias solo por content_key a procedimientos de ritual_sesion.v1.json (y practica.v1.json cuando exista), a términos de glosario.v1.json y a ilustraciones por id de app/assets/manifest.json. Lo no declarado se omite y queda marcado provisional.
Contrato: rollback: Revertir la extensión del generador y eliminar instructivo.v1.json; acerca_de.v1.json no cambia.. Status: done

#### S5.T3 — Escribir tests/test_catalogo_acerca_de.py y tests/test_catalogo_instructivo.py: claves de la Adenda 2, títulos de HU-10-04, catalogVersion obligatorio, patrón contentKey ^[a-z0-9]+(-[a-z0-9]+)*$, marca provisional, ausencia de origen, autoría y créditos, referencias solo por content_key sin copiar procedimientos, y --check falla si cambia el contenido sin subir catalogVersion.
Contrato: rollback: Eliminar los dos archivos de test nuevos.. Status: done

#### S5.T4 — Ajustar scripts/validate_editorial_catalog.py para resolver términos contra docs/content/catalogos/glosario.v1.json (campo contentKey), procedimientos contra la lista explícita [ritual_sesion.v1.json, practica.v1.json si existe] e ilustraciones contra app/assets/manifest.json, y validar los catálogos reales de Acerca de e Instructivo. Reutiliza la validación de casas y manifiesto de scripts/catalog_common.py sin duplicarla. Cada falla nombra capítulo o apartado y clave.
Contrato: rollback: Revertir los cambios en scripts/validate_editorial_catalog.py a su versión previa.. Status: done

#### S5.T5 — Implementar en scripts/catalog_common.py (reutilizado por los generadores de glosario, Acerca de e Instructivo) la lectura de approvals de correcciones_editoriales_<catálogo>.v1.json ({nodeKeys o "all", approvedBy, approvedAt, reference}) y la regla: se quita editorialStatus de los nodos cubiertos; sin aprobación el nodo sale con editorialStatus="provisional". No guardar approvedBy en el catálogo generado.
Contrato: rollback: Revertir el commit en scripts/catalog_common.py y en los generadores; todos los nodos salen provisional sin lectura de approvals.. Status: done

#### S6.T1 — Escribir los tests del validador contra los catálogos reales (el validador pasa sobre glosario, acerca_de e instructivo reales) y fixtures solo para los casos de error: término inexistente, procedimiento inexistente (QA-02-11-03, nombra capítulo y clave) e ilustración fuera del manifiesto; caso borde con practica.v1.json ausente. Archivo: tests/test_validador_catalogo_editorial.py.
Contrato: rollback: Eliminar tests/test_validador_catalogo_editorial.py o revertir los casos agregados.. Status: pending

#### S6.T2 — Registrar glosario.v1.json, acerca_de.v1.json e instructivo.v1.json en scripts/sync_app_catalogs.py para copiarlos a app/assets/catalogos/ (los generadores no copian por sí mismos) y generar las copias. El --check de cada generador falla si la copia difiere.
Contrato: rollback: Quitar los tres registros de scripts/sync_app_catalogs.py y eliminar las copias en app/assets/catalogos/.. Status: pending

#### S6.T3 — Crear tres cargadores Dart de solo lectura (glosario, Acerca de, Instructivo) junto al cargador de arcanos; confirmar la ruta real con Glob en app/lib antes de crearlos. Leen app/assets/catalogos/*.v1.json sin red y entregan los nodos con content_key y content_version.
Contrato: rollback: Eliminar los tres cargadores Dart y sus exports; el cargador de arcanos no cambia.. Status: pending

#### S6.T4 — Escribir las pruebas Dart de los tres cargadores contra los assets reales: 16 términos, 8 bloques y 9 capítulos con content_key y content_version, junto a la prueba del cargador de arcanos.
Contrato: rollback: Eliminar los archivos de prueba Dart nuevos.. Status: pending

#### S6.T5 — Escribir tests de aprobación editorial (editorialStatus provisional por defecto, approvals con nodeKeys y con "all", rechazo de valores inválidos en el esquema, ausencia de approvedBy en el catálogo generado) para glosario, Acerca de e Instructivo, en tests/test_editorial_approvals.py.
Contrato: rollback: Eliminar tests/test_editorial_approvals.py.. Status: pending

#### S7.T1 — Agregar a .github/workflows/ci-pr.yml, en el paso Gates de build documental (--check) del job docs, los comandos python3 scripts/build_glosario_catalog.py --check y python3 scripts/build_acerca_instructivo_catalog.py --check.
Contrato: rollback: Quitar las dos líneas agregadas en ci-pr.yml.. Status: pending

#### S7.T2 — Documentar en docs/development/commands.md los generadores scripts/build_glosario_catalog.py y scripts/build_acerca_instructivo_catalog.py con su --check (uso, parámetros y ejemplo), con el patrón de los generadores de TAO-198 y TAO-199.
Contrato: rollback: Revertir las secciones agregadas en docs/development/commands.md.. Status: pending

#### S7.T3 — Escribir en docs/content/SCHEMA.md la sección de glosario, Acerca de e Instructivo, y dejar compliant con el linter todo doc de .docs-baseline.txt que se haya tocado (por ejemplo docs/content/10_registro_cierre_y_glosario.md si se modifica), normalizando el patrón que el linter rechaza. Comando: DOCS_DIFF_BASE=origin/main node scripts/dev/docs.mjs check.
Contrato: rollback: Revertir la sección de SCHEMA.md y la normalización de formato de los docs tocados.. Status: pending
## Cambios al modelo de datos

Ninguno.

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-02 (edit) `confirmed`: El validador del catálogo comprueba el reparto y la coherencia cruzada. Cada arcano pertenece a exactamente una casa y la Casa 2 tiene los a
- REQ-03 (edit) `confirmed`: Un JSON Schema editorial común modela Acerca de (bloques que reutilizan las claves de HU-10-15) y el Instructivo (los nueve capítulos de V-4
- REQ-04 (edit) `confirmed`: El catálogo de arcanos expone catalogVersion como content_version. El generador lo copia a app/assets/catalogos/ y su --check corre en el jo
- REQ-06 (edit) `confirmed`: El generador se llama scripts/build_arcanos_catalog.py (nombre único en spec, sesiones y reviewOutcome) y, con su --check, el schema, la cop
- REQ-08 (edit) `confirmed`: Todo doc de .docs-baseline.txt (una ruta por línea, # para comentarios) que el ticket modifique, incluidos docs/content/imagenes/01_arcanos.
- REQ-09 (add) `confirmed`: Las correcciones editoriales de nombres o palabras mágicas entre docs/content/imagenes/01_arcanos.md y las casas se registran en docs/conten

**Tasks agregadas:**

- S1: En scripts/build_arcanos_catalog.py (con --check, patrón de scripts/build_house_catalog.py y scripts/catalog_common.py) implementar el mecanismo de catalogVersion: calcular un hash del contenido versionado y guardarlo junto al catálogo, como los catálogos existentes; --check falla si cambia el contenido (p. ej. el nombre de un arcano) sin subir catalogVersion, o si la copia en app/assets/catalogos/ difiere. Usar este nombre único de generador en el reviewOutcome de la sesión 1. (valida: REQ-04, REQ-06; rollback: Revertir los cambios en scripts/build_arcanos_catalog.py y borrar el hash y la copia generados en app/assets/catalogos/.)
- S1: Crear docs/content/catalogos/correcciones_editoriales_arcanos.v1.json con el patrón de los demás correcciones_editoriales_*.v1.json, y hacer que scripts/build_arcanos_catalog.py aplique esas correcciones para reconciliar nombres o palabras mágicas entre docs/content/imagenes/01_arcanos.md y docs/content/catalogos/casas.v1.json. (valida: REQ-09, REQ-02; rollback: Borrar correcciones_editoriales_arcanos.v1.json y revertir la lectura de correcciones en el generador.)
- S2: Implementar el validador de referencias con rutas reales: casas en docs/content/catalogos/casas.v1.json, láminas en app/assets/manifest.json, procedimientos por contentKey contra los *.v1.json de docs/content/catalogos/ (ritual_sesion.v1.json, claves ritual-step-01; fixture para el catálogo de TAO-207) y glosario con contrato docs/content/catalogos/glosario.v1.json, campo contentKey, probado solo con fixtures (el catálogo real llega en TAO-215). Enumerar en el esquema las claves de bloque de Acerca de (HU-10-15) y los nueve capítulos de V-46, probados con fixtures. (valida: REQ-02, REQ-03; rollback: Revertir el validador, el esquema editorial y los fixtures añadidos.)
- S2: Dejar compliant con el linter los docs tocados del baseline (docs/content/imagenes/01_arcanos.md, docs/content/SCHEMA.md) y verificar con node scripts/dev/docs.mjs check usando DOCS_DIFF_BASE=origin/main; .docs-baseline.txt lista una ruta por línea y # para comentarios. (valida: REQ-08; rollback: Revertir la normalización de los docs y restaurar .docs-baseline.txt.)

### Enmienda 2
**REQs:**

- REQ-02 (edit) `confirmed`: El validador del catálogo comprueba el reparto y la coherencia cruzada. Cada arcano pertenece a exactamente una casa y la Casa 2 tiene los a
- REQ-03 (edit) `confirmed`: Un JSON Schema editorial común modela Acerca de (bloques que reutilizan las claves de HU-10-15) y el Instructivo (los nueve capítulos de V-4
- REQ-06 (edit) `confirmed`: El generador se llama scripts/build_arcanos_catalog.py (nombre único en spec, sesiones y reviewOutcome) y, con su --check, el schema, la cop
- REQ-08 (edit) `confirmed`: Todo doc de .docs-baseline.txt (una ruta por línea, # para comentarios) que el ticket modifique, incluidos docs/content/imagenes/01_arcanos.
- REQ-09 (edit) `confirmed`: Las correcciones editoriales de nombres o palabras mágicas entre docs/content/imagenes/01_arcanos.md y las casas se registran en docs/conten

**Tasks agregadas:**

- S1: Test de REQ-09: escribir pytest (scripts/tests/test_arcanos_correcciones_editoriales.py) que valida que docs/content/catalogos/correcciones_editoriales_arcanos.v1.json tiene la misma estructura que los demás correcciones_editoriales_*.v1.json, que scripts/build_arcanos_catalog.py aplica cada corrección y la deja trazada en el catálogo, y que una discrepancia de nombre o palabra mágica entre 01_arcanos.md y casas.v1.json sin corrección registrada hace fallar al generador nombrando el arcano. Reutiliza scripts/catalog_common.py y sigue el patrón de scripts/build_house_catalog.py. (valida: REQ-09, test; rollback: Eliminar scripts/tests/test_arcanos_correcciones_editoriales.py.)
- S2: Fixtures y test del esquema editorial: crear fixtures con los ocho bloques de Acerca de (intro-no-es-oraculo, intro-cada-proyecto-es-un-viaje, intro-participacion-activa, intro-metodo-fisico, intro-que-es-tao-mangalam, intro-para-que-sirve, intro-elementos-fisicos, intro-recorrido) y los capítulos instructivo-cap-01 a instructivo-cap-09 con los títulos de HU-10-04, y probar que el esquema valida el patrón contentKey en minúsculas con guiones y rechaza claves fuera de patrón. Resolución de procedimientos con lista explícita de catálogos (ritual_sesion.v1.json, más el de TAO-207 cuando exista, hoy con fixture), sin glob. Casas y manifiesto no se revalidan aquí: se reutiliza la validación única. (valida: REQ-03, REQ-02, test; rollback: Eliminar los fixtures y el test de esquema editorial nuevos; conservar el esquema.)
- S2: Verificar el linter de docs sobre los docs tocados por el ticket (docs/content/imagenes/01_arcanos.md, docs/content/SCHEMA.md y docs/development/commands.md): normalizar el patrón que el linter rechaza y confirmar compliance con el comando DOCS_DIFF_BASE=origin/main node scripts/dev/docs.mjs check, con .docs-baseline.txt como baseline (una ruta por línea, # para comentarios). (valida: REQ-08, REQ-07; rollback: Revertir los cambios de formato en los docs con git checkout de esos archivos.)

**Task ops:**

- edit S2.T4 { verify=["python3 scripts/validate_editorial_catalog.py","python3 -m pytest scripts/tests/test_validate_editorial_catalog.py"] }

### Enmienda 3
**REQs:**

- REQ-03 (edit) `confirmed`: Un JSON Schema editorial común modela Acerca de (bloques que reutilizan las claves de HU-10-15) y el Instructivo (los nueve capítulos de V-4
- REQ-04 (edit) `confirmed`: El catálogo de arcanos expone catalogVersion como content_version. La copia a app/assets/catalogos/ se registra en scripts/sync_app_catalogs
- REQ-06 (edit) `confirmed`: El generador se llama scripts/build_arcanos_catalog.py (nombre único en spec, sesiones y reviewOutcome). Con su --check, el schema y el carg

**Task ops:**

- delete S2.T5
- edit S1.T1 { desc="Crear scripts/build_arcanos_catalog.py con su --check, siguiendo el patrón de scripts/build_house_catalog.py y scripts/catalog_common.py (no build_result_catalog.py). Genera los 22 arcanos (ids 0 a 21, content_key estable por número) desde docs/content/imagenes/01_arcanos.md con catalogVersion y el hash del contenido versionado almacenado junto al catálogo. El generador no copia a app/assets/catalogos/: esa copia se registra en scripts/sync_app_catalogs.py." }
- edit S1.T1.2 { desc="Reutilizar scripts/catalog_common.py y el patrón de scripts/build_house_catalog.py para el hash de contenido, la escritura determinista y el modo --check. No tomar scripts/build_result_catalog.py como patrón." }
- edit S1.T1.3 { desc="Implementar UNA sola vez, como funciones reutilizables en scripts/catalog_common.py, la validación de coherencia con docs/content/catalogos/casas.v1.json (nombre y palabra mágica por arcano asociado a una casa; reparto de una casa por arcano, Casa 2 con arcanos 2 y 12) y la validación de existencia del id de lámina en app/assets/manifest.json. El generador y scripts/validate_editorial_catalog.py solo las invocan." }
- edit S1.T2 { verify=["DOCS_DIFF_BASE=origin/main node scripts/dev/docs.mjs check"] }
- edit S1.T3 { verify=["DOCS_DIFF_BASE=origin/main node scripts/dev/docs.mjs check"] }
- edit S1.T4 { desc="Escribir tests/test_catalogo_arcanos.py (unittest) con esquema, fidelidad, reparto, coherencia con casas y manifiesto, rechazo de campo de interpretación y regla de catalogVersion. Mantener python3 scripts/build_result_catalog.py --check solo como regresión.", rollback="Eliminar tests/test_catalogo_arcanos.py.", verify=["python3 -m unittest discover -s tests -p 'test_catalogo_arcanos.py'","python3 scripts/build_result_catalog.py --check"] }
- edit S1.T5 { desc="Registrar la copia del catálogo de arcanos a app/assets/catalogos/ en scripts/sync_app_catalogs.py (el generador no copia por sí mismo), con el patrón de scripts/build_house_catalog.py y scripts/catalog_common.py, y agregar el --check al paso Gates de build documental (--check) de .github/workflows/ci-pr.yml, ubicado por su nombre." }
- edit S1.T7 { desc="Escribir tests/test_arcanos_correcciones_editoriales.py (unittest) que valide REQ-09: el generador aplica y deja trazadas las correcciones de docs/content/catalogos/correcciones_editoriales_arcanos.v1.json.", rollback="Eliminar tests/test_arcanos_correcciones_editoriales.py.", verify=["python3 -m unittest discover -s tests -p 'test_arcanos_correcciones_editoriales.py'"] }
- edit S2.T1 { desc="Definir el JSON Schema editorial común para Acerca de e Instructivo con claves validadas por patrón contentKey (^[a-z0-9]+(-[a-z0-9]+)*$), no por enum. Las referencias a procedimientos se resuelven contra una lista explícita de catálogos de procedimientos (hoy docs/content/catalogos/ritual_sesion.v1.json, más el catálogo de TAO-207 cuando exista), no un glob.", verify=["DOCS_DIFF_BASE=origin/main node scripts/dev/docs.mjs check"] }
- edit S2.T3 { desc="Escribir la única suite tests/test_catalogo_editorial.py (unittest) que cubre el esquema editorial y el validador: patrón de contentKey (el edge rechaza una clave que viola el patrón), referencias rotas con apartado y clave, y lista explícita de catálogos de procedimientos. Unifica las suites previas de S2.T3 y S2.T6.", rollback="Eliminar tests/test_catalogo_editorial.py.", verify=["python3 -m unittest discover -s tests -p 'test_catalogo_editorial.py'"] }
- edit S2.T4 { desc="Implementar scripts/validate_editorial_catalog.py. Resuelve procedimientos por contentKey contra una lista explícita de catálogos de procedimientos (hoy docs/content/catalogos/ritual_sesion.v1.json, más el catálogo de TAO-207 cuando exista), no un glob. Las validaciones de casas y manifiesto solo se invocan desde las funciones de scripts/catalog_common.py definidas en S1.T1.3, sin reimplementarlas.", verify=["python3 -m unittest discover -s tests -p 'test_catalogo_editorial.py'"] }
- edit S2.T6 { desc="Cubrir los casos QA-02-11-02 y QA-02-11-03 dentro de la misma suite tests/test_catalogo_editorial.py (unittest), sin crear otra suite.", rollback="Revertir los casos agregados a tests/test_catalogo_editorial.py.", verify=["python3 -m unittest discover -s tests -p 'test_catalogo_editorial.py'"] }
- edit S2.T7 { verify=["DOCS_DIFF_BASE=origin/main node scripts/dev/docs.mjs check"] }

### Enmienda 4
**REQs:**

- REQ-03 (edit) `confirmed`: Un JSON Schema editorial común modela Acerca de (bloques que reutilizan las claves de HU-10-15) y el Instructivo (los nueve capítulos de V-4
- REQ-04 (edit) `confirmed`: El catálogo de arcanos expone catalogVersion como content_version. La copia a app/assets/catalogos/ se registra en scripts/sync_app_catalogs

**Tasks agregadas:**

- S2: Escribir app/test/catalogos/arcanos_catalog_test.dart para el cargador Dart de arcanos (confirmar con Glob que la ruta queda junto al test del cargador de resultados de TAO-198). Casos: el catálogo empaquetado entrega 22 arcanos ordenados 0..21, cada uno con content_key, y content_version igual a catalogVersion; un asset con arcanos desordenados se entrega ordenado por número; El Loco tiene número 0 y alias 22; un asset sin catalogVersion lanza un error tipado. Las assertions usan valores concretos. (valida: REQ-05, test; rollback: Eliminar app/test/catalogos/arcanos_catalog_test.dart; el cargador y el catálogo quedan intactos.)

**Task ops:**

- edit S2.T3 { desc="Escribir la única suite del esquema editorial y su validador, tests/test_catalogo_editorial.py (absorbe lo que antes estaba en S2.T6). Cubre: esquema de Acerca de e Instructivo con fixtures; catalogVersion (content_version) obligatorio en ambos, con un test que falla si falta; patrón de claves ^[a-z0-9]+(-[a-z0-9]+)*$ con un caso que lo viola y se rechaza; referencias rotas a procedimientos (lista explícita de catálogos), glosario (docs/content/catalogos/glosario.v1.json, campo contentKey) e ilustraciones del manifiesto, con falla que nombra el apartado o capítulo y la clave (QA-02-11-03). No incluye QA-02-11-02, que vive en la suite de arcanos de S1.T4.", rollback="Eliminar tests/test_catalogo_editorial.py; el esquema y el validador quedan intactos.", validates=["REQ-03"], isTest=true, verify=["python -m pytest tests/test_catalogo_editorial.py"] }
- delete S2.T6
- edit S2.T1 { desc="Definir el JSON Schema editorial común para Acerca de (bloques con claves de HU-10-15) y para el Instructivo (nueve capítulos de V-46 con apartados). Ambos documentos exigen catalogVersion (content_version) como campo obligatorio. Las claves de bloque y capítulo usan el patrón ^[a-z0-9]+(-[a-z0-9]+)*$, sin enum. Cada apartado lleva content_key, texto y fuente, y admite referencias opcionales a un procedimiento por content_key, a un término del glosario y a una ilustración del manifiesto por id." }
- edit S1.T3 { desc="Implementar scripts/build_arcanos_catalog.py con su --check, reutilizando scripts/catalog_common.py y siguiendo el patrón de scripts/build_house_catalog.py. El hash del contenido versionado se almacena junto al catálogo. Esta task es la única que agrega el --check de arcanos al paso Gates de build documental (--check) de .github/workflows/ci-pr.yml; S1.T5 no lo repite.", rollback="Revertir scripts/build_arcanos_catalog.py y la línea de --check de arcanos en .github/workflows/ci-pr.yml; los demás generadores y sus --check no se tocan." }
- edit S1.T4 { desc="Escribir tests/test_catalogo_arcanos.py: esquema, fidelidad contra 01_arcanos.md, reparto (cada arcano en exactamente una casa, Casa 2 con los arcanos 2 y 12), coherencia con casas.v1.json, lámina en el manifiesto y rechazo de campo de interpretación. Incluye QA-02-11-02: un catálogo de prueba con El Loco con id 22 falla nombrando El Loco. Incluye la prueba de REQ-07: un test que lee docs/development/commands.md y falla si falta la entrada del generador de arcanos (build_arcanos_catalog.py) o de su --check.", rollback="Eliminar tests/test_catalogo_arcanos.py; el generador y la documentación quedan intactos.", validates=["REQ-01","REQ-02","REQ-07"], isTest=true, verify=["python -m pytest tests/test_catalogo_arcanos.py"] }
- edit S1.T5 { rollback="Restaurar el catalogVersion y su hash del catálogo de arcanos anteriores y revertir el registro del catálogo en scripts/sync_app_catalogs.py; no se toca ci-pr.yml, que modifica solo S1.T3." }
- edit S1.T1.3 { rollback="Revertir los cambios en scripts/catalog_common.py (la utilidad común de comprobación de casas y manifiesto); los generadores existentes siguen usando sus versiones previas." }

### Enmienda 5
**REQs:**

- REQ-05 (edit) `inferred`: Un cargador Dart de solo lectura lee el catálogo empaquetado en app/assets/catalogos/arcanos.v1.json y entrega los arcanos ordenados por núm

**Task ops:**

- edit S1.T1 { desc="Implementar el generador scripts/build_arcanos_catalog.py y su --check, con el patrón de scripts/build_house_catalog.py y scripts/catalog_common.py (no build_result_catalog.py). Salidas: docs/content/catalogos/arcanos.v1.json y docs/content/catalogos/arcanos.v1.schema.json (22 arcanos, ids 0 a 21, alias 22 solo en El Loco, sin campos de interpretación). Aplica las correcciones de docs/content/catalogos/correcciones_editoriales_arcanos.v1.json. Esta task no toca ci-pr.yml ni docs/development/commands.md (van en S1.T3).", rollback="Eliminar scripts/build_arcanos_catalog.py, docs/content/catalogos/arcanos.v1.json y docs/content/catalogos/arcanos.v1.schema.json; el resto del repo no cambia.", verify=["python3 -m unittest discover -s tests -p 'test_catalogo_arcanos.py'","python3 scripts/build_arcanos_catalog.py --check"] }
- edit S1.T2 { desc="Normalizar solo el formato de docs/content/imagenes/01_arcanos.md (y de cualquier otro doc de .docs-baseline.txt que el ticket modifique) para que pase el linter de docs: DOCS_DIFF_BASE=origin/main node scripts/dev/docs.mjs check. Sin cambios de contenido: nombres y palabras mágicas no se editan aquí. Las correcciones de contenido van solo en docs/content/catalogos/correcciones_editoriales_arcanos.v1.json (S1.T6).", rollback="git checkout -- docs/content/imagenes/01_arcanos.md y de los demás docs normalizados; revertir también su línea en .docs-baseline.txt si se quitó.", verify=["DOCS_DIFF_BASE=origin/main node scripts/dev/docs.mjs check"] }
- edit S1.T3 { desc="Integración en CI y documentación, sin lógica del generador. (1) Agregar python3 scripts/build_arcanos_catalog.py --check al paso Gates de build documental (--check) del job docs de .github/workflows/ci-pr.yml, localizándolo por nombre. (2) Escribir en docs/development/commands.md la entrada del generador build_arcanos_catalog.py con su uso, la opción --check y un ejemplo, siguiendo el patrón de las entradas de TAO-198 y TAO-199. Valida REQ-04 y REQ-07. S1.T1 conserva la implementación del generador y del schema.", rollback="Quitar la línea del --check de arcanos en .github/workflows/ci-pr.yml y la entrada de build_arcanos_catalog.py en docs/development/commands.md.", validates=["REQ-04","REQ-07"], isTest=false, verify=["python3 scripts/build_arcanos_catalog.py --check","DOCS_DIFF_BASE=origin/main node scripts/dev/docs.mjs check"] }
- edit S1.T4 { desc="Escribir tests/test_catalogo_arcanos.py (runner: python3 -m unittest, sin pytest). Cubre esquema, fidelidad, reparto, coherencia con docs/content/catalogos/casas.v1.json y manifiesto app/assets/manifest.json, y además: (REQ-04) una copia en app/assets/catalogos/ editada a mano hace fallar --check nombrando el archivo; el cambio de nombre de un arcano sin subir catalogVersion hace fallar --check (hash del contenido versionado). (REQ-07) un test que lee docs/development/commands.md y exige la entrada de build_arcanos_catalog.py con la opción --check. Los tests no modifican el repo real: usan copias temporales.", rollback="Eliminar tests/test_catalogo_arcanos.py; no hay otros efectos.", validates=["REQ-01","REQ-02","REQ-04","REQ-06","REQ-07"], isTest=true, verify=["python3 -m unittest discover -s tests -p 'test_catalogo_arcanos.py'","python3 scripts/build_result_catalog.py --check","python3 scripts/build_house_catalog.py --check"] }
- edit S1.T5 { desc="Implementar catalogVersion como content_version con un hash del contenido versionado almacenado junto al catálogo (mecanismo de scripts/catalog_common.py, como los catálogos existentes), de modo que --check falle si cambia el contenido sin subir catalogVersion. Registrar la copia a app/assets/catalogos/ en scripts/sync_app_catalogs.py (el generador no copia por sí mismo). No modifica ci-pr.yml ni commands.md (van en S1.T3).", rollback="Revertir el registro de arcanos en scripts/sync_app_catalogs.py, eliminar la copia en app/assets/catalogos/ y el hash almacenado junto a docs/content/catalogos/arcanos.v1.json.", verify=["python3 -m unittest discover -s tests -p 'test_catalogo_arcanos.py'","python3 scripts/build_arcanos_catalog.py --check"] }
- edit S2.T1 { desc="Crear el esquema editorial común docs/content/catalogos/editorial.v1.schema.json para Acerca de (bloques con claves de HU-10-15) e Instructivo (nueve capítulos de V-46 con apartados), con catalogVersion obligatorio y claves validadas por el patrón ^[a-z0-9]+(-[a-z0-9]+)*$, no por enum. Cada apartado lleva content_key, texto y fuente, y puede referenciar procedimiento, término del glosario e ilustración del manifiesto. Se prueba solo con fixtures en tests/fixtures/editorial/.", rollback="Eliminar docs/content/catalogos/editorial.v1.schema.json y los fixtures en tests/fixtures/editorial/.", verify=["python3 -m unittest discover -s tests -p 'test_catalogo_editorial.py'"] }

### Enmienda 6
**REQs:**

- REQ-08 (edit) `confirmed`: Todo doc de .docs-baseline.txt (una ruta por línea, # para comentarios) que el ticket modifique, incluidos docs/content/imagenes/01_arcanos.
- REQ-09 (edit) `confirmed`: Las correcciones editoriales de nombres o palabras mágicas entre docs/content/imagenes/01_arcanos.md y las casas se registran en docs/conten
- REQ-06 (edit) `confirmed`: El generador se llama scripts/build_arcanos_catalog.py (nombre único en spec, sesiones y reviewOutcome). Con su --check, el schema y el carg

**Tasks agregadas:**

- S2: Escribir en docs/content/SCHEMA.md la sección del esquema editorial (Acerca de e Instructivo) y del catálogo de arcanos: campos, patrón de contentKey ^[a-z0-9]+(-[a-z0-9]+)*$, catalogVersion como content_version, referencias a procedimientos, glosario y manifiesto, y rechazo de campos de interpretación (DEC-048). Dejar el doc compliant con el linter de docs. (valida: REQ-08; rollback: Revertir solo la sección agregada a docs/content/SCHEMA.md con git checkout del archivo.)

**Task ops:**

- edit S1.T4 { desc="Mantener lo ya descrito y reincorporar estos casos en tests/test_catalogo_arcanos.py: QA-02-11-02 (El Loco con id 22 en un catálogo de prueba hace fallar el validador nombrando El Loco); el esquema rechaza un campo de interpretación agregado a un arcano (DEC-048); arcano 8 = La Fuerza con «audacia, fuerza» y arcano 11 = La Justicia con «sabiduría social. El afán debe ser justo»; El Loco tiene número 0, alias 22 y pertenece a la Casa 12, y ningún otro arcano tiene alias. Esta tarea es la que ejecuta el verify de test_catalogo_arcanos.py, que corre después de S1.T1 y S1.T5.", verify=["python3 -m unittest discover -s tests -p test_catalogo_arcanos.py"] }
- edit S1.T1 { verify=[] }
- edit S1.T5 { desc="Mantener lo ya descrito. Esta tarea es el único dueño del hash de catalogVersion: hash del contenido versionado almacenado junto al catálogo, con las utilidades de scripts/catalog_common.py. Su verify de test_catalogo_arcanos.py se ejecuta en S1.T4, no aquí.", verify=[] }
- edit S1.T7 { desc="Mantener lo ya descrito y sumar los dos casos vinculantes de REQ-09 en tests/test_arcanos_correcciones_editoriales.py: una discrepancia de nombre o palabra mágica no registrada hace fallar scripts/build_arcanos_catalog.py nombrando el arcano, y docs/content/catalogos/correcciones_editoriales_arcanos.v1.json valida contra la misma forma que los demás correcciones_editoriales_*.v1.json.", validates=["REQ-09"], isTest=true, verify=["python3 -m unittest discover -s tests -p test_arcanos_correcciones_editoriales.py"] }
- edit S1.T2 { desc="Mantener lo ya descrito. Esta tarea es el único dueño de la normalización de formato de docs/content/imagenes/01_arcanos.md para el linter (sin cambios de contenido; las correcciones van en correcciones_editoriales_arcanos.v1.json). Verificar con DOCS_DIFF_BASE=origin/main node scripts/dev/docs.mjs check.", verify=["DOCS_DIFF_BASE=origin/main node scripts/dev/docs.mjs check"] }
- edit S2.T3 { verify=["python3 -m unittest discover -s tests -p test_catalogo_editorial.py"] }
- edit S2.T4 { rollback="Revertir solo scripts/validate_editorial_catalog.py y su test (git checkout de esos archivos); no tocar la normalización de docs (S1.T2) ni el hash de catalogVersion (S1.T5)." }

### Enmienda 7
**REQs:**

- REQ-03 (edit) `confirmed`: Un JSON Schema editorial común modela Acerca de (bloques que reutilizan las claves de HU-10-15) y el Instructivo (los nueve capítulos de V-4
- REQ-07 (edit) `confirmed`: docs/development/commands.md documenta el comando del generador del catálogo de arcanos y su --check, y los de los generadores nuevos (scrip
- REQ-10 (add) `confirmed`: Un generador scripts/build_glosario_catalog.py (con --check y el patrón de scripts/catalog_common.py) produce docs/content/catalogos/glosari
- REQ-11 (add) `confirmed`: Un generador (scripts/build_acerca_instructivo_catalog.py, que reutiliza scripts/catalog_common.py sin duplicar su lógica) produce el catálo
- REQ-12 (add) `confirmed`: El mismo generador produce el catálogo de los nueve capítulos del Instructivo (instructivo-cap-01 a instructivo-cap-09) con los títulos de H
- REQ-13 (add) `confirmed`: El validador de referencias (scripts/validate_editorial_catalog.py) se prueba contra los catálogos reales (glosario.v1.json, ritual_sesion.v
- REQ-14 (add) `confirmed`: Los tres catálogos nuevos (glosario.v1.json, el de Acerca de y el del Instructivo) se copian a app/assets/catalogos/ registrándolos en scrip
- REQ-15 (add) `confirmed`: El job docs de CI (paso Gates de build documental (--check) de .github/workflows/ci-pr.yml) corre el --check de scripts/build_glosario_catal
- REQ-16 (add) `confirmed`: Lo que no se puede generar desde la documentación queda marcado provisional y fuera del contenido aprobado: los catálogos generados (glosari

**Tasks agregadas:**

- S4: Crear scripts/build_glosario_catalog.py con --check (patrón de scripts/catalog_common.py y scripts/build_house_catalog.py), el JSON Schema del glosario y docs/content/catalogos/correcciones_editoriales_glosario.v1.json. Generar docs/content/catalogos/glosario.v1.json desde los 16 términos de docs/content/10_registro_cierre_y_glosario.md: contentKey (ancla), término, definición breve, tags del front matter, text, sourceText, sourceRefs a docs/content/fuentes/02_como_usar_tao_mangalam.md y editorialResolutionId si el texto difiere. Omitir explicación ampliada, sinónimos, relacionados y contextos (sin null). catalogVersion con hash del contenido versionado almacenado junto al catálogo, marca provisional. (valida: REQ-10, REQ-16; rollback: Eliminar scripts/build_glosario_catalog.py, el schema, correcciones_editoriales_glosario.v1.json y glosario.v1.json; no se tocan otros catálogos.)
- S4: Escribir tests/test_catalogo_glosario.py (16 términos y contentKey exactas, claves opcionales ausentes y nunca null, sourceRefs resolubles, marca provisional, cambio de contenido sin subir catalogVersion falla --check) y tests/test_glosario_correcciones_editoriales.py (forma igual a los demás correcciones_editoriales_*.v1.json y discrepancia no registrada falla nombrando el término). (valida: REQ-10, REQ-16, test; rollback: Eliminar los dos archivos de test nuevos.)
- S5: Crear scripts/build_acerca_instructivo_catalog.py con --check (reutiliza scripts/catalog_common.py), el JSON Schema editorial común y la salida de Acerca de: docs/content/catalogos/acerca_de.v1.json desde docs/content/fuentes/01_que_es_tao_mangalam.md con los ocho bloques de la Adenda 2, texto, sourceRefs, catalogVersion con hash y marca provisional (DEC-082: sin origen, autoría ni créditos). (valida: REQ-03, REQ-11, REQ-16; rollback: Eliminar scripts/build_acerca_instructivo_catalog.py, el schema editorial y acerca_de.v1.json.)
- S5: Extender scripts/build_acerca_instructivo_catalog.py para generar docs/content/catalogos/instructivo.v1.json: nueve capítulos instructivo-cap-01 a instructivo-cap-09 con los títulos de HU-10-04 (docs/backlog/EP-10_biblioteca_ayuda_y_aprendizaje.md, desde la línea 613), apartados con content_key, texto y fuente, y referencias solo por content_key a procedimientos de ritual_sesion.v1.json (y practica.v1.json cuando exista), a términos de glosario.v1.json y a ilustraciones por id de app/assets/manifest.json. Lo no declarado se omite y queda marcado provisional. (valida: REQ-03, REQ-12, REQ-16; rollback: Revertir la extensión del generador y eliminar instructivo.v1.json; acerca_de.v1.json no cambia.)
- S5: Escribir tests/test_catalogo_acerca_de.py y tests/test_catalogo_instructivo.py: claves de la Adenda 2, títulos de HU-10-04, catalogVersion obligatorio, patrón contentKey ^[a-z0-9]+(-[a-z0-9]+)*$, marca provisional, ausencia de origen, autoría y créditos, referencias solo por content_key sin copiar procedimientos, y --check falla si cambia el contenido sin subir catalogVersion. (valida: REQ-03, REQ-11, REQ-12, REQ-16, test; rollback: Eliminar los dos archivos de test nuevos.)
- S5: Ajustar scripts/validate_editorial_catalog.py para resolver términos contra docs/content/catalogos/glosario.v1.json (campo contentKey), procedimientos contra la lista explícita [ritual_sesion.v1.json, practica.v1.json si existe] e ilustraciones contra app/assets/manifest.json, y validar los catálogos reales de Acerca de e Instructivo. Reutiliza la validación de casas y manifiesto de scripts/catalog_common.py sin duplicarla. Cada falla nombra capítulo o apartado y clave. (valida: REQ-03, REQ-13; rollback: Revertir los cambios en scripts/validate_editorial_catalog.py a su versión previa.)
- S6: Escribir los tests del validador contra los catálogos reales (el validador pasa sobre glosario, acerca_de e instructivo reales) y fixtures solo para los casos de error: término inexistente, procedimiento inexistente (QA-02-11-03, nombra capítulo y clave) e ilustración fuera del manifiesto; caso borde con practica.v1.json ausente. Archivo: tests/test_validador_catalogo_editorial.py. (valida: REQ-03, REQ-13, test; rollback: Eliminar tests/test_validador_catalogo_editorial.py o revertir los casos agregados.)
- S6: Registrar glosario.v1.json, acerca_de.v1.json e instructivo.v1.json en scripts/sync_app_catalogs.py para copiarlos a app/assets/catalogos/ (los generadores no copian por sí mismos) y generar las copias. El --check de cada generador falla si la copia difiere. (valida: REQ-14; rollback: Quitar los tres registros de scripts/sync_app_catalogs.py y eliminar las copias en app/assets/catalogos/.)
- S6: Crear tres cargadores Dart de solo lectura (glosario, Acerca de, Instructivo) junto al cargador de arcanos; confirmar la ruta real con Glob en app/lib antes de crearlos. Leen app/assets/catalogos/*.v1.json sin red y entregan los nodos con content_key y content_version. (valida: REQ-14; rollback: Eliminar los tres cargadores Dart y sus exports; el cargador de arcanos no cambia.)
- S6: Escribir las pruebas Dart de los tres cargadores contra los assets reales: 16 términos, 8 bloques y 9 capítulos con content_key y content_version, junto a la prueba del cargador de arcanos. (valida: REQ-14, test; rollback: Eliminar los archivos de prueba Dart nuevos.)
- S7: Agregar a .github/workflows/ci-pr.yml, en el paso Gates de build documental (--check) del job docs, los comandos python3 scripts/build_glosario_catalog.py --check y python3 scripts/build_acerca_instructivo_catalog.py --check. (valida: REQ-15; rollback: Quitar las dos líneas agregadas en ci-pr.yml.)
- S7: Documentar en docs/development/commands.md los generadores scripts/build_glosario_catalog.py y scripts/build_acerca_instructivo_catalog.py con su --check (uso, parámetros y ejemplo), con el patrón de los generadores de TAO-198 y TAO-199. (valida: REQ-07; rollback: Revertir las secciones agregadas en docs/development/commands.md.)
- S7: Escribir en docs/content/SCHEMA.md la sección de glosario, Acerca de e Instructivo, y dejar compliant con el linter todo doc de .docs-baseline.txt que se haya tocado (por ejemplo docs/content/10_registro_cierre_y_glosario.md si se modifica), normalizando el patrón que el linter rechaza. Comando: DOCS_DIFF_BASE=origin/main node scripts/dev/docs.mjs check. (valida: REQ-08; rollback: Revertir la sección de SCHEMA.md y la normalización de formato de los docs tocados.)

**Task ops:**

- move S1.T6 → S3
- move S1.T7 → S3
- move S1.T8 → S3
- move S1.T9 → S3
- move S1.T10 → S3
- move S2.T6 → S4
- move S2.T7 → S4

### Enmienda 8
**REQs:**

- REQ-13 (edit) `confirmed`: El validador de referencias (scripts/validate_editorial_catalog.py) valida SOLO tres tipos de referencia: ilustraciones contra app/assets/ma
- REQ-16 (edit) `confirmed`: Lo que no se puede generar desde la documentación queda marcado provisional. El esquema editorial común define el campo opcional editorialSt

**Tasks agregadas:**

- S3: Crear docs/content/catalogos/correcciones_editoriales_arcanos.v1.json con la misma forma que los demás correcciones_editoriales_*.v1.json y aplicarlo en scripts/build_arcanos_catalog.py: las correcciones registradas se aplican y quedan trazadas en el catálogo; una discrepancia de nombre o palabra mágica entre 01_arcanos.md y casas.v1.json no registrada hace fallar el generador nombrando el arcano. Reutilizar scripts/catalog_common.py. (valida: REQ-09; rollback: Revertir el commit: eliminar correcciones_editoriales_arcanos.v1.json y la lógica de correcciones en scripts/build_arcanos_catalog.py; el catálogo vuelve a generarse sin correcciones.)
- S3: Escribir tests/test_arcanos_correcciones_editoriales.py: (a) el archivo correcciones_editoriales_arcanos.v1.json valida contra la misma forma que los demás correcciones_editoriales_*.v1.json; (b) una discrepancia no registrada hace fallar el generador nombrando el arcano; (c) una corrección registrada se aplica y queda trazada. (valida: REQ-09, test; rollback: Eliminar tests/test_arcanos_correcciones_editoriales.py.)
- S5: Implementar en scripts/catalog_common.py (reutilizado por los generadores de glosario, Acerca de e Instructivo) la lectura de approvals de correcciones_editoriales_<catálogo>.v1.json ({nodeKeys o "all", approvedBy, approvedAt, reference}) y la regla: se quita editorialStatus de los nodos cubiertos; sin aprobación el nodo sale con editorialStatus="provisional". No guardar approvedBy en el catálogo generado. (valida: REQ-16; rollback: Revertir el commit en scripts/catalog_common.py y en los generadores; todos los nodos salen provisional sin lectura de approvals.)
- S6: Escribir tests de aprobación editorial (editorialStatus provisional por defecto, approvals con nodeKeys y con "all", rechazo de valores inválidos en el esquema, ausencia de approvedBy en el catálogo generado) para glosario, Acerca de e Instructivo, en tests/test_editorial_approvals.py. (valida: REQ-16, test; rollback: Eliminar tests/test_editorial_approvals.py.)

**Task ops:**

- edit S5.T1 { desc="Extender el JSON Schema editorial común ya definido para Acerca de e Instructivo con los campos de los catálogos nuevos (glosario, bloques de Acerca de, capítulos con apartados) y el campo opcional editorialStatus con valor \"provisional\" por nodo. No crear un esquema paralelo: los esquemas de glosario.v1.json, acerca_de.v1.json e instructivo.v1.json referencian/extienden el común. Mantener el patrón de contentKey ^[a-z0-9]+(-[a-z0-9]+)*$ y catalogVersion obligatorio.", validates=["REQ-03","REQ-10","REQ-16"] }
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T1.1
- [x] S1.T1.2
- [x] S1.T1.3
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4
- [x] S1.T5

**Gate (auto)**: Pasan python3 -m unittest discover -s tests -p test_catalogo_arcanos.py y python3 -m unittest discover -s tests -p test_arcanos_correcciones_editoriales.py; el generador con --check termina en 0 y el linter de docs no reporta los archivos tocados.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2
- [x] S2.T3
- [x] S2.T4
- [x] S2.T8
- [x] S2.T9

**Gate (auto)**: El validador editorial falla sobre el fixture de QA-02-11-03 con un mensaje que nombra el capítulo y la clave, y pasa sobre el fixture válido. flutter test del cargador de arcanos pasa con 22 arcanos ordenados y su content_version.

### Session 3 · T0 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T2
- [ ] S3.T3
- [ ] S3.T4

### Session 4 · continue

**Tasks:**
- [x] S4.T1
- [x] S4.T2
- [x] S4.T3

**Gate (auto)**: Pasan python3 -m unittest discover -s tests -p test_catalogo_glosario.py y el --check del generador de glosario, con 16 términos y sin campos null.

### Session 5 · continue

**Tasks:**
- [x] S5.T1
- [x] S5.T2
- [x] S5.T3
- [x] S5.T4
- [x] S5.T5

**Gate (auto)**: Se generan acerca_de.v1.json e instructivo.v1.json con 8 y 9 nodos, el --check de cada uno termina en 0 y pasan sus tests.

### Session 6 · open

**Tasks:**
- [ ] S6.T1
- [ ] S6.T2
- [ ] S6.T3
- [ ] S6.T4
- [ ] S6.T5

**Gate (auto)**: El validador editorial pasa sobre los catálogos reales (glosario, Acerca de, Instructivo, procedimientos y manifiesto) y falla nombrando el apartado con los fixtures de error; pasa cd app && flutter test de los cargadores.

### Session 7 · open

**Tasks:**
- [ ] S7.T1
- [ ] S7.T2
- [ ] S7.T3

**Gate (auto)**: El job docs de ci-pr.yml incluye los --check de cada generador nuevo y DOCS_DIFF_BASE=origin/main node scripts/dev/docs.mjs check pasa sin ampliar .docs-baseline.txt.
