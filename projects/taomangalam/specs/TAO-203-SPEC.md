---
id: TAO-203-SPEC
project: taomangalam
ticket: TAO-203
status: approved
---

# TAO-203 · HU-02-06 Catálogo signos_personalidades.v1: 12 signos y 9 personalidades con rasgos, rangos, procedimiento del cálculo y profundidad V-29, trazado a la fuente

## Resumen ejecutivo

Se agrega el generador determinista scripts/build_sign_catalog.py, que reutiliza scripts/catalog_common.py. Produce docs/content/catalogos/signos_personalidades.v1.json con su JSON Schema y su archivo de correcciones editoriales, más la copia en app/assets/catalogos/. El catálogo trae 12 signos (content_key estable del 1 al 12), 9 personalidades, los rangos de la fuente y del producto, el procedimiento del cálculo (tm-src-numerologia#p0016 a p0017) y la profundidad V-29 en cada nodo. El --check se suma al paso 'Gates de build documental (--check)' de ci-pr.yml, y se agrega un cargador Dart de solo lectura que reutiliza errores_catalogo.dart.
NO incluye: el cálculo del número ni del signo (HU-04-02), las láminas (HU-02-18), la interfaz del perfil (EP-04), cambios en build_signos.py o build_fichas.py, ni ediciones en las fichas de docs/content/signos/ y docs/content/personalidad/. No hay versionado por hash: catalogVersion queda fijo en 1.0.0.
Cómo se sabe que funciona: el generador termina sin error con 12 signos y 9 personalidades. Las palabras mágicas de Tauro varían por bloque. Libra no tiene regente, y solo Aries tiene elemento. El 21 de mayo tiene signo con la fila del producto. Si se edita un rasgo a mano, la fidelidad falla nombrando el nodo. Si una ficha cambia sin regenerar, --check falla nombrando el archivo. El test Dart carga el catálogo, y build_result_catalog.py --check sigue en verde.
Tamaño: 5 puntos en 2 sesiones (generador y pruebas; luego empaquetado, CI, documentación y cargador Dart).
ADVERTENCIAS: el catálogo es un asset JSON empaquetado, no una tabla ni un seed de base de datos, por eso dataModelChanges queda vacío. Los datos que ni las fichas ni una DEC respalden se registran como preguntas abiertas para Contenido y no se inventan. La marca de profundidad necesita revisión humana de Contenido (QA humana), y esa revisión no se puede automatizar.
Datos a confirmar antes de ejecutar:
1) Runner de las pruebas Python, pytest o unittest: confirmar en tests/test_catalog_common.py y en el job de CI que corre tests/.
2) Valores literales de profundidad de V-29 (p.ej. 'estandar'/'avanzado'): confirmar en docs/backlog/EP-04_consultantes_y_personalidad.md (vista V-29) y en resultados.v1.schema.json de TAO-198.
3) Comando local del linter de docs para un archivo (markdownlint-cli2, Vale): confirmar en el job docs de .github/workflows/ci-pr.yml y en package.json raíz.
4) Formato de la ecuación del signo y del glifo en las fichas: confirmar leyendo docs/content/signos/01_*.md.
5) Archivo y ancla exactos de las variantes de palabras mágicas de DEC-139: confirmar en docs/product/decisiones/.

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-02_contenido_empaquetado_y_assets.md:119

El generador scripts/build_sign_catalog.py produce docs/content/catalogos/signos_personalidades.v1.json, que valida contra signos_personalidades.v1.schema.json y trae exactamente 12 signos y 9 personalidades. Cada nodo tiene un content_key único y estable (signos por número del 1 al 12, personalidades del 1 al 9), y catalogVersion es la constante '1.0.0' del script. La salida es determinista.

### REQ-02 `confirmed`
> Fuente: taomangalam/scripts/build_signos.py:389

Cada signo trae nombre, glifo, ecuación, palabras mágicas por bloque (DEC-139), bloques del hombre y de la mujer en el orden de la fuente (DEC-072) con presentación, luces, sombras, trabajo y amor, más las características generales. Regente y elemento aparecen solo cuando la fuente los declara: se omiten en vez de quedar null o vacíos.

### REQ-03 `confirmed`
> Fuente: taomangalam/scripts/build_signos.py:380

Cada signo trae dos filas de rangos de fechas: la de la fuente y la del producto (DEC-073, DEC-031). Solo la del producto queda marcada como la que usa el cálculo.

### REQ-04 `confirmed`
> Fuente: taomangalam/docs/content/fuentes/05_numerologia_y_personalidad.md:128

Cada personalidad (1 a 9) trae su síntesis, sus luces y sombras resumidas y la lista completa de rasgos. El catálogo incluye además el procedimiento del cálculo del número personal tomado de tm-src-numerologia#p0016 a p0017.

### REQ-05 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-04_consultantes_y_personalidad.md:276

Todo nodo declara su profundidad según V-29. Características generales, regente, elemento, presentación, trabajo, amor, la lista completa de rasgos y el procedimiento del cálculo quedan como Avanzado; el resto, como Estándar.

### REQ-06 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-02_contenido_empaquetado_y_assets.md:531

Las pruebas de fidelidad comparan cada nodo textual con su fuente o con una resolución declarada en correcciones_editoriales_signos_personalidades.v1.json. Cada ancla citada debe existir. Si algo falla, el error nombra el content_key y el nodo.

### REQ-07 `confirmed`
> Fuente: taomangalam/.github/workflows/ci-pr.yml:1199

El generador escribe la copia app/assets/catalogos/signos_personalidades.v1.json, que queda registrada en app/pubspec.yaml. Con --check compara la fuente regenerada con la copia y, si difieren, falla nombrando el archivo. Ese --check corre en el paso 'Gates de build documental (--check)' de ci-pr.yml, que conserva las líneas existentes.

### REQ-08 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-02_contenido_empaquetado_y_assets.md:598

El cargador Dart de solo lectura (app/lib/catalogos/cargador_catalogo_signos_personalidades.dart y catalogo_signos_personalidades.dart) lee el asset empaquetado sin red y expone signos, personalidades, rangos y profundidad. Ante un asset inválido usa errores_catalogo.dart.

### REQ-09 `confirmed` `enforcement`
> Fuente: taomangalam/scripts/build_signos.py:370

Se reutiliza el patrón existente sin duplicarlo: scripts/catalog_common.py, tests/test_catalog_common.py y app/lib/catalogos/errores_catalogo.dart. No se tocan scripts/build_signos.py, scripts/build_fichas.py ni las fichas de docs/content/signos/ y docs/content/personalidad/. Un dato sin respaldo en la fuente ni en una DEC se registra como pregunta abierta para Contenido y no se inventa.

### REQ-10 `confirmed` `variant`
> Fuente: sonda:card-docs-de-superficie-6c8ae176a6

docs/development/commands.md documenta el uso del generador build_sign_catalog.py y de su --check, con parámetros y un ejemplo. También documenta la regla de subir catalogVersion ante un cambio de texto.

### REQ-11 `confirmed` `variant`
> Fuente: sonda:card-lint-de-docs-4d9deffd06

Lo que se modifique en docs/development/commands.md (y en docs/content/SCHEMA.md, si se toca) queda compliant con el linter de docs del baseline, de modo que el job docs y quality-gate no queden en rojo. Las fichas fuente no se editan.
## Tasks

#### S1.T1 — Construir el generador scripts/build_sign_catalog.py sobre scripts/catalog_common.py (importar, no copiar) con catalogVersion='1.0.0' como constante. Escribe docs/content/catalogos/signos_personalidades.v1.json, signos_personalidades.v1.schema.json y correcciones_editoriales_signos_personalidades.v1.json. Solo lee docs/content/signos/ y docs/content/personalidad/; no edita las fichas ni toca build_signos.py ni build_fichas.py.
Contrato: rollback: Eliminar scripts/build_sign_catalog.py y los tres archivos de docs/content/catalogos/signos_personalidades*.json y correcciones_editoriales_signos_personalidades.v1.json. Status: done

#### S1.T1.1 — Escribir el JSON Schema signos_personalidades.v1.schema.json: catalogVersion, signos[12] y personalidades[9] con content_key único, el enum de profundidad V-29 en todo nodo, regente y elemento opcionales (sin null), los bloques del hombre y de la mujer, rangos con una fila 'fuente' y otra 'producto', con la marca de cálculo solo en la del producto, y el nodo del procedimiento.
Contrato: rollback: Eliminar docs/content/catalogos/signos_personalidades.v1.schema.json. Status: done

#### S1.T1.2 — Parsear las 12 fichas de docs/content/signos/ y armar cada signo: content_key por número 1 a 12, nombre, glifo, ecuación, palabras mágicas por bloque (Tauro: hombre 'estabilidad y belleza', mujer 'belleza y fertilidad', DEC-139; el resto con la misma lista en ambos bloques), bloques del hombre y de la mujer en el orden de la fuente (DEC-072), características generales, y regente y elemento solo si la ficha los declara (Libra sin regente, solo Aries con elemento).
Contrato: rollback: Revertir la sección de signos de scripts/build_sign_catalog.py. Status: done

#### S1.T1.3 — Agregar los rangos por signo: la fila de la fuente y la fila del producto (DEC-073, DEC-031), con la misma fuente de datos que usa build_signos.py para 'Fechas en la fuente' y 'Fechas del producto' (sin modificar build_signos.py) y la marca de cálculo solo en la del producto.
Contrato: rollback: Revertir la sección de rangos de scripts/build_sign_catalog.py. Status: done

#### S1.T1.4 — Parsear las 9 fichas de docs/content/personalidad/ (síntesis, luces y sombras resumidas, lista completa de rasgos) y extraer el procedimiento del cálculo de docs/content/fuentes/05_numerologia_y_personalidad.md#p0016 a #p0017, citando las anclas. Asignar la profundidad V-29 a cada nodo: Avanzado para características generales, regente, elemento, presentación, trabajo, amor, rasgos completos y procedimiento.
Contrato: rollback: Revertir las secciones de personalidades y profundidad de scripts/build_sign_catalog.py. Status: done

#### S1.T1.5 — Implementar la fidelidad: cada nodo textual coincide con su fuente o tiene una resolución en correcciones_editoriales_signos_personalidades.v1.json, y cada ancla existe; el error nombra el content_key y el nodo. Los datos sin respaldo en la fuente ni en una DEC se registran como preguntas abiertas para Contenido en el archivo de correcciones o en el resumen de la sesión, sin inventarlos.
Contrato: rollback: Revertir la verificación de fidelidad y vaciar correcciones_editoriales_signos_personalidades.v1.json. Status: done

#### S1.T2 — Escribir tests/test_sign_catalog.py, reutilizando los helpers de tests/test_catalog_common.py. Cubre schema y conteos 12/9, content_key único, determinismo, catalogVersion '1.0.0', Tauro y los otros 11 signos, Libra sin regente, solo Aries con elemento, el orden de los bloques, las dos filas de rangos y la cobertura de 366 días (incluido el 21 de mayo), las personalidades y el procedimiento p0016/p0017, la profundidad por nodo, la fidelidad (QA-02-06-02 con un rasgo editado), el ancla inexistente y la regresión de build_signos.py --check y build_fichas.py --check.
Contrato: rollback: Eliminar tests/test_sign_catalog.py. Status: done

#### S1.T2.1 — Crear tests/test_sign_catalog.py con los fixtures comunes (importados de tests/test_catalog_common.py, sin copiarlos) y los casos de estructura: QA-02-06-01 (generador con código 0, len(signos)==12, len(personalidades)==9), validación contra signos_personalidades.v1.schema.json, content_key único (un duplicado inyectado falla nombrando la clave), dos corridas con bytes idénticos y catalogVersion == '1.0.0'.
Contrato: rollback: Eliminar tests/test_sign_catalog.py. Status: done

#### S1.T2.2 — Agregar los casos de signos: Tauro con 'estabilidad y belleza' en el bloque del hombre y 'belleza y fertilidad' en el de la mujer, los otros 11 signos con la misma lista en ambos bloques, Libra sin la clave 'regente', Acuario y Piscis con regente tradicional y moderno, solo Aries con 'elemento', y el orden de los bloques igual al de cada ficha de docs/content/signos/.
Contrato: rollback: Revertir los casos de signos en tests/test_sign_catalog.py. Status: done

#### S1.T2.3 — Agregar los casos de rangos: cada signo con una fila 'fuente' y una 'producto' y la marca de cálculo solo en la del producto, QA-02-06-03 (el 21 de mayo fuera de toda fila de la fuente y dentro de exactamente una del producto), cobertura de los 366 días sin solapes incluido el 29 de febrero, y coincidencia con 'Fechas en la fuente' y 'Fechas del producto' del índice de build_signos.py.
Contrato: rollback: Revertir los casos de rangos en tests/test_sign_catalog.py. Status: done

#### S1.T2.4 — Agregar los casos de personalidades y profundidad: las 9 personalidades con síntesis, luces, sombras y rasgos no vacíos, la cantidad de rasgos igual a la de cada ficha de docs/content/personalidad/, el procedimiento citando p0016 y p0017 con texto igual a la fuente, todo nodo con profundidad del enum, los nodos Avanzado esperados, y un nodo sin profundidad haciendo fallar el schema.
Contrato: rollback: Revertir los casos de personalidades y profundidad en tests/test_sign_catalog.py. Status: done

#### S1.T2.5 — Agregar los casos de fidelidad sobre una copia temporal del JSON: con el repo limpio pasa para 12 signos y 9 personalidades, QA-02-06-02 (un rasgo editado a mano falla y el mensaje nombra el content_key y el nodo), un ancla inexistente en una corrección editorial falla nombrando esa ancla, y un nodo distinto de la fuente con corrección declarada pasa.
Contrato: rollback: Revertir los casos de fidelidad en tests/test_sign_catalog.py. Status: done

#### S1.T2.6 — Agregar los casos de regresión de REQ-09: git diff contra origin/main sin cambios en scripts/build_signos.py, scripts/build_fichas.py, docs/content/signos/ ni docs/content/personalidad/; build_sign_catalog.py importa catalog_common y no redefine sus funciones de serialización, validación ni check; y build_signos.py --check y build_fichas.py --check terminan con código 0.
Contrato: rollback: Revertir los casos de regresión en tests/test_sign_catalog.py. Status: done

#### S2.T1 — Agregar al generador la escritura de app/assets/catalogos/signos_personalidades.v1.json y el modo --check, usando el check de catalog_common.py: compara la fuente regenerada con la copia y falla nombrando el archivo que difiere. Registrar el asset en app/pubspec.yaml junto a los catálogos existentes.
Contrato: rollback: Revertir el modo --check y la escritura de la copia en build_sign_catalog.py, quitar la entrada de app/pubspec.yaml y borrar app/assets/catalogos/signos_personalidades.v1.json. Status: pending

#### S2.T2 — Agregar 'python3 scripts/build_sign_catalog.py --check' en el paso 'Gates de build documental (--check)' de .github/workflows/ci-pr.yml (líneas 1199 a 1204), conservando las líneas de build_fichas, build_manual_y_personalidad, build_signos y build_result_catalog, y las que hayan agregado TAO-199 y TAO-202.
Contrato: rollback: Quitar la línea agregada en .github/workflows/ci-pr.yml. Status: pending

#### S2.T3 — Documentar en docs/development/commands.md el uso de build_sign_catalog.py y de su --check, con parámetros, un ejemplo y la regla de subir catalogVersion ante un cambio de texto. La sección debe quedar compliant con el linter de docs del baseline.
Contrato: rollback: Revertir la sección agregada en docs/development/commands.md. Status: pending

#### S2.T4 — Crear app/lib/catalogos/catalogo_signos_personalidades.dart (modelos inmutables: signo, bloque, rango, personalidad, procedimiento y profundidad) y app/lib/catalogos/cargador_catalogo_signos_personalidades.dart, de solo lectura, que carga el asset empaquetado sin red y lanza los errores de errores_catalogo.dart ante una versión o un campo inválidos, siguiendo el cargador de resultados de TAO-198.
Contrato: rollback: Eliminar los dos archivos Dart nuevos de app/lib/catalogos/. Status: pending

#### S2.T5 — Pruebas de la etapa. Escribir app/test/catalogos/cargador_catalogo_signos_personalidades_test.dart (12/9 y versión '1.0.0', Libra sin regente, variantes de Tauro, 21 de mayo con signo en el rango del producto, error tipado ante un JSON inválido) y ampliar tests/test_sign_catalog.py con estos casos: --check falla ante una ficha sin regenerar y ante una copia editada nombrando el archivo, build_result_catalog.py --check sigue en verde, ci-pr.yml conserva las líneas previas y commands.md contiene la sección del generador.
Contrato: rollback: Eliminar el test Dart y revertir los casos agregados en tests/test_sign_catalog.py. Status: pending
## Cambios al modelo de datos

Ninguno.

## Sessions

### Session 1 · T3 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T1.1
- [x] S1.T1.2
- [x] S1.T1.3
- [x] S1.T1.4
- [x] S1.T1.5
- [x] S1.T2
- [x] S1.T2.1
- [x] S1.T2.2
- [x] S1.T2.3
- [x] S1.T2.4
- [x] S1.T2.5
- [x] S1.T2.6

**Gate (auto)**: docs/content/catalogos/signos_personalidades.v1.json se genera con 12 signos y 9 personalidades y valida contra su schema. tests/test_sign_catalog.py pasa en verde y muestra el caso QA-02-06-02 fallando con el content_key y el nodo nombrados cuando se edita un rasgo.

### Session 2 · T2 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T2
- [ ] S2.T3
- [ ] S2.T4
- [ ] S2.T5

**Gate (auto)**: python3 scripts/build_sign_catalog.py --check pasa y falla nombrando el archivo cuando la copia o la fuente difieren. ci-pr.yml corre ese --check junto a las líneas existentes, commands.md documenta el generador sin errores de lint y el test Dart de app/test/catalogos/ carga 12 signos y 9 personalidades.

### Session 3 · T0 · open
