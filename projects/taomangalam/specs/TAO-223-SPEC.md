---
id: TAO-223-SPEC
project: taomangalam
ticket: TAO-223
status: approved
---

# TAO-223 · Política de privacidad v1 en español: texto fuente en docs/legal, resumen para V-51, copias empaquetadas con hash coincidente y registro de aprobaciones

## Resumen ejecutivo

Qué se hace: se reemplaza docs/legal/privacidad-v1.0.md (Adenda 1) con la política de privacidad v1 en español, con versión, vigencia provisional (PENDIENTE-VIGENCIA) y hash. Cubre datos por tipo de cuenta, analítica seudónima por región (opt_in en UE/EEE y región desconocida, opt_out o disabled según la región), proveedores, retención y eliminación, y accesos administrativos auditados. Incluye la sección '## Resumen' para V-51, la propagación a app/assets/legal/ y server/legal/ con el mecanismo de hash existente, y el registro docs/legal/aprobaciones-privacidad-v1.0.md, cuyo formato define esta historia (Adenda 2).
Qué NO se hace: términos de uso (HU-03a-14), declaraciones de App Store y Google Play (HU-17-10), texto de politica_analitica_region (HU-15-03), cambios de UI de V-51 (HU-01-13), mecanismos nuevos de empaquetado o hash, seeds o filas de documento_legal, ni ejecución de legal:registrar (REQ-13).
Cómo se sabe que funciona: la fuente y las copias tienen el mismo hash según la regla confirmada en S1.T1, y pasan cd app && flutter test test/legal/ y node scripts/ci/ep01-legal-provider.mjs. El apartado de analítica no contiene "anónima" para métricas. Cada dato que el servidor recibe de una cuenta de dispositivo en M1a aparece descrito (QA-03a-15-01). El registro de aprobaciones queda creado con las entradas pendientes de cada revisor.
Tamaño: tres sesiones de código (S1 redacción, S2 registro y contraste con el redactor de logs, S3 vigencia real), una de revisión (S4) y una de verificación humana (S5), unos 5 puntos. ADVERTENCIAS: (1) S3 está bloqueada hasta que se fije la fecha de vigencia real. (2) La comparación con staging, las aprobaciones de asesoría legal, Producto y Operación/release, QA-03a-15-02 y QA-03a-15-03 son items humanos de S5; sin acceso de solo lectura a staging se continúa con v1.0 y queda como pendiente humano (REQ-18). (3) La identidad legal del responsable y la región de Railway son pendientes externos: el texto no declara ubicación ni transferencias definitivas hasta que Operación/release las confirme.

Datos resueltos al revisar el spec (antes eran datos a confirmar):
- Rutas: fuente docs/legal/privacidad-v1.0.md, copias app/assets/legal/privacidad-v1.0.md y server/legal/privacidad-v1.0.md; pruebas app/test/legal/empaquetado_test.dart y scripts/ci/ep01-legal-provider.mjs (Adenda 1, verificadas en el repo).
- Regla de hash (archivo completo o sin encabezado): la confirma S1.T1 leyendo app/lib/features/legal/data/textos_legales_empaquetados.dart.
- Registro de aprobaciones: docs/legal/aprobaciones-privacidad-v1.0.md, formato definido aquí (Adenda 2); TAO-222 lo reutilizará después.
- Fila de documento_legal en staging: la registra el pipeline de HU-03a-10 (DEC-222); este ticket solo la consulta en S5.
- Redactor de logs: docs/product/tecnologia/23_observabilidad_logs_debug_y_costos.md, sección 3 (Adenda 2).
- Pendiente externo: identidad legal del responsable del tratamiento y región de despliegue de Railway.
## Requirements

### REQ-01 `confirmed`
> Fuente: Pedido de enmienda; Adenda 1 (rutas verificadas y fuente privacidad-v1.0.md); Adenda 2 (registro de aprobaciones); hecho verificado: el hash se calcula sobre el archivo completo; Adenda 3 (ruta del registro en docs/legal/aprobaciones/)

Existe en docs/legal/privacidad-v1.0.md el texto fuente de la política de privacidad en español (DEC-049), en Markdown, con versión y vigencia en el encabezado YAML existente (patrón de terminos-v1.0.md); su hash SHA-256 se calcula sobre el archivo completo y se anota en docs/legal/aprobaciones/privacidad-v1.0.md (Adenda 3), no dentro del propio archivo. El archivo se REEMPLAZA (privacidad-v1.0.md, como fija la Adenda 1); no se crea otra versión. El contenido por tema lo cubren REQ-14 (datos por tipo de cuenta), REQ-15 (proveedores), REQ-16 (retención y eliminación), REQ-17 (accesos administrativos), REQ-02 (analítica) y REQ-03 (resumen para V-51), sin contradecir las DEC citadas. La identidad legal del responsable del tratamiento, la región de despliegue de Railway, la aprobación de asesoría legal y la aceptación de Producto son pendientes externos declarados en el texto o en el registro de aprobación: NO son tareas de código y NO bloquean la redacción (sí bloquean la sesión 3). Reemplaza el texto versionado de un archivo; no implica borrar datos existentes ni editar una versión ya publicada.

### REQ-02 `confirmed`
> Fuente: Alcance: Incluye, analítica (DEC-171, DEC-058, DEC-130); Criterios de aceptación: apartado de analítica; Adenda 1

El apartado de analítica dice que es propia y sin terceros (DEC-171), seudónima y nunca anónima (DEC-058), opt_in en UE/EEE y en región desconocida, opt_out o disabled según la región, y que se puede cambiar desde Cuenta (DEC-130). Es coherente con el comportamiento real del puerto de analítica (puerto_analitica.dart), que aplica opt_in sin red o sin política válida. S1.T1 (solo lectura) registra la referencia (símbolo o función, sin número de línea fijo) en sus notas y en el caso de prueba; el REQ no se edita para guardarla. La verificación se hace dentro del apartado de analítica de docs/legal/privacidad-v1.0.md (tarea S1.T5): se extrae desde su encabezado ## hasta el siguiente ## (incluye subtítulos ###), el apartado no es vacío, 0 coincidencias del patrón insensible a mayúsculas 'an[oó]nim[ao]s?' (cubre plurales) y al menos una de 'seud[oó]nim'; no con grep de 'anonim' sobre todo el archivo (la palabra 'anonimizada' es obligatoria en retención).

### REQ-03 `confirmed`
> Fuente: Alcance: Incluye, entregable (resumen breve para V-51)

El resumen breve de la política de privacidad para V-51 es una sección del mismo texto fuente docs/legal/privacidad-v1.0.md con el encabezado exacto '## Resumen' (terminos-v1.0.md no trae una sección de resumen que copiar: el título lo fija S1.T3). No existe un archivo aparte para el resumen. Es coherente con el texto completo y con su misma versión 1.0. La sección de resumen (desde '^## Resumen' hasta el siguiente '^## ') debe mencionar 'cuenta de dispositivo', 'cuenta completa', 'seudónima' y 'eliminación', comprobando cada término por separado, y no debe contener el patrón insensible a mayúsculas 'an[oó]nim[ao]s?'. No se exige que el resumen contenga literalmente '7 días', '90 días' ni '12 meses'. El texto fuente lo redacta S1.T2 y el resumen lo redacta S1.T3, que se ejecuta después de S1.T2 y se deriva de él. S1.T1 sigue siendo la primera tarea de la sesión y es de solo lectura.

### REQ-04 `confirmed`
> Fuente: Requisitos transversales: Offline/sync (DEC-219); Criterios de aceptacion: hash

Las copias empaquetadas del texto en app/assets/legal/privacidad-v1.0.md y server/legal/privacidad-v1.0.md coinciden en hash con la fuente docs/legal/privacidad-v1.0.md, de modo que el texto viaja en la app para el primer uso sin red (DEC-219). La propagación de las copias y la actualización del hash que consumen textos_legales_empaquetados.dart y la suite del servidor se hacen en S1.T6, con la regla de hash confirmada en S1.T1, en el mismo commit y la misma sesión, para no dejar los chequeos de hash en rojo entre sesiones. El gate de S1 y su reviewOutcome se evalúan sobre docs/legal/privacidad-v1.0.md según la Adenda 1 (sin condicionar a una rama 1.1 ni a una aprobación del dev para otra versión) y exigen que pasen cd app && flutter test test/legal/ y node scripts/ci/ep01-legal-provider.mjs.

### REQ-05 `confirmed`
> Fuente: Pedido de cambio (3); Adenda 2 y Adenda 3

Queda el registro de aprobaciones docs/legal/aprobaciones/privacidad-v1.0.md (subcarpeta, Adenda 3, para no romper el listado de versiones de docs/legal; se crea el directorio docs/legal/aprobaciones/ si no existe), cuyo formato lo define esta historia (Adenda 2): encabezado con documento, versión 1.0, hash SHA-256 del texto y fecha de vigencia (o marcador provisional); una sección por revisor (Asesoría legal, Producto, Operación/release) con nombre o rol, fecha, veredicto (aprobado / aprobado con observaciones / rechazado), observaciones y cómo se resolvió cada una; en Asesoría legal, una línea explícita sobre el tratamiento en UE/EEE (P-227); en Operación/release, la región de despliegue confirmada; y al final la comparación de hash fuente vs app/assets vs server/legal vs staging con su resultado. Las rutas docs/legal/aprobaciones-privacidad-v1.0.md y docs/legal/aprobaciones-terminos-v1.0.md quedan obsoletas y no se usan. La estructura mínima de la Adenda 2 PREVALECE sobre el registro de términos de TAO-222 ya existente en docs/legal/aprobaciones/terminos-v1.0.md: el ejecutor lo lee (solo lectura) y compara; si hay diferencias de estructura se REPORTAN en las notas de la tarea, no se copian al registro de privacidad ni se alinea la estructura de privacidad hacia abajo para igualar a términos. Este ticket no modifica el archivo de términos y no hay dependencia de ejecución entre ambos tickets. La detección de un hash registrado distinto de la fuente es humana: quien revisa compara el hash del registro con el de la fuente y con la fila de documento_legal de staging; la publicación queda pendiente hasta completar el registro (control manual, sin bloqueo automático ni chequeo automático; REQ-07 prohíbe scripts nuevos). Adjuntar el registro a GH-94 lo confirma el dev aparte; no es tarea del ejecutor.

### REQ-06 `inferred`
> Fuente: Requisitos transversales: Accesibilidad/responsive

El texto tiene una jerarquía de títulos Markdown sin saltos de nivel, para lector de pantalla y lectura en teléfono y tablet, sin tablas anchas que se corten en pantallas angostas.

### REQ-07 `inferred` `enforcement`
> Fuente: taomangalam/.github/workflows/ci-pr.yml:113

Reusar el patrón de TAO-222 (términos v1): misma ubicación de la fuente en docs/legal/, mismo formato de encabezado (versión, vigencia, hash), mismo mecanismo de empaquetado hacia app/assets/legal/ y server/legal/ y mismo chequeo de hash. No crear un script, una ruta ni un formato nuevos.

### REQ-08 `confirmed`
> Fuente: Pedido de enmienda; Adenda 1 (vigencia aún no fijada, marcador provisional y hash recalculado al fijarla); hecho verificado: el hash se calcula en ejecución y legal:registrar exige fecha válida; Adenda 3 (ruta del registro)

El marcador provisional de vigencia va en el campo vigente_desde del encabezado YAML de docs/legal/privacidad-v1.0.md (vigente_desde: PENDIENTE-VIGENCIA), sin fecha inventada; la tarea S1.T4 se limita a dejar ese marcador. Como legal:registrar (server/src/legal/registro-version.ts) exige una fecha válida en vigente_desde, el marcador impide a propósito registrar o publicar esta versión antes de fijar la vigencia real. Al fijarse la fecha real (S3.T1) el hash del archivo completo cambia y se propaga copiando la fuente a app/assets/legal/privacidad-v1.0.md y server/legal/privacidad-v1.0.md; no hay hash que actualizar en textos_legales_empaquetados.dart ni en la suite del servidor (lo calculan en ejecución). El nuevo hash se anota en docs/legal/aprobaciones/privacidad-v1.0.md, todo en el mismo commit y la misma sesión.

### REQ-09 `confirmed`
> Fuente: Pedido de cambio punto 5; Adenda 2 punto 2

S1.T1 es de SOLO LECTURA y es la primera tarea de la sesión 1: verifica que app/test/legal/empaquetado_test.dart y scripts/ci/ep01-legal-provider.mjs comparan contra docs/legal/; confirma en textos_legales_empaquetados.dart si el hash se calcula sobre el archivo completo o sin el encabezado; y lee puerto_analitica.dart registrando la referencia (símbolo o función, sin número de línea fijo) que confirma opt_in sin red o sin política válida, en sus notas y en el caso de prueba. No escribe ni reemplaza archivos. La comprobación en staging es el item de verificación humana de la sesión 5 (verificación) (REQ-18). legal:registrar no se ejecuta en ningún verify. S1.T6 y S3.T1 usan la regla de hash confirmada en S1.T1. Sin crear scripts ni formatos nuevos.

### REQ-10 `confirmed`
> Fuente: Pedido de enmienda; requisito transversal de seguridad/privacidad del request; Adenda 2 (ubicación del redactor de logs, sección 3); Adenda 3 (ruta del registro)

El texto de la política se contrasta con el redactor de logs (docs/product/tecnologia/23_observabilidad_logs_debug_y_costos.md, sección 3) y con DEC-197: el registro de errores sin datos personales y los logs operativos de 7 días descritos en la política no contradicen lo que el redactor omite o enmascara. El caso de revisión vive como sección '## Contraste con el redactor de logs' dentro de docs/legal/aprobaciones/privacidad-v1.0.md, con cada dato que la política declara excluido de logs y su resultado (coincide / contradicción).

### REQ-11 `confirmed`
> Fuente: Pedido de enmienda; Adenda 1 (vigencia pendiente y hash recalculado); Adenda 2 (acceso a staging como pendiente humano); pendientes externos del request (responsable y región de Railway); Adenda 3 (ruta del registro)

La sesión 3 es de código y queda declarada bloqueada hasta que existan la fecha de vigencia real y la confirmación escrita de Operación/release y de asesoría legal de la identidad legal del responsable del tratamiento y de la región de despliegue de Railway. Su única tarea es S3.T1, que incorpora responsable y región al texto, fija la vigencia, recalcula y propaga. Su reviewOutcome es: el hash final con la vigencia real es idéntico en la fuente docs/legal/privacidad-v1.0.md y en las copias app/assets/legal/ y server/legal/, calculado sobre el archivo completo, y ese hash queda anotado en el encabezado de docs/legal/aprobaciones/privacidad-v1.0.md. La comparación con la fila de documento_legal de staging (acceso de solo lectura por el túnel), las aprobaciones de los revisores y QA-03a-15-02/03 siguen como items de verificación humana de la sesión 5 (verificación). La sesión 4 de review no lleva tareas.

### REQ-12 `confirmed`
> Fuente: Pedido de cambio punto 10; Requisitos transversales (Compatibilidad/migración)

El texto o el registro de aprobación deja documentado que un tratamiento nuevo agregado en M2 u otro hito exige una versión nueva de la política con exige_reaceptacion.

### REQ-13 `confirmed`
> Fuente: DEC-222; HU-03a-10

Sin cambios al modelo de datos: la fila de documento_legal (tipo privacidad, versión 1.0) la registra el pipeline legal:registrar según DEC-222 (HU-03a-10); este ticket no crea fila ni seed ni ejecuta legal:registrar.

### REQ-14 `confirmed`
> Fuente: Request TAO-223, Alcance/Incluye 'Datos por tipo de cuenta'; QA-03a-15-01

El texto describe los datos por tipo de cuenta. Cuenta de dispositivo: las consultas quedan solo en el teléfono y al servidor llegan identidad técnica del dispositivo, aceptaciones, consentimiento, usos de producto y métricas si corresponde (DEC-212). Cuenta completa: correo, respaldo y sincronización de los datos del recorrido, incluidos nombre y fecha de nacimiento de consultantes, con cifrado en reposo (DEC-164), soporte (DEC-216) y medios en la nube del propio usuario con el permiso guardado solo en el teléfono (DEC-044, DEC-227). Cada dato que el servidor recibe de una cuenta de dispositivo en M1a aparece descrito.

### REQ-15 `confirmed`
> Fuente: Request TAO-223, Alcance/Incluye 'Proveedores que tratan datos'

El texto declara los proveedores que tratan datos: alojamiento del servidor y base (DEC-164, DEC-195), registro de errores sin datos personales (DEC-197) y correo transaccional (DEC-165). No nombra a la región de Railway ni inventa transferencias: eso queda como pendiente externo.

### REQ-16 `confirmed`
> Fuente: Request TAO-223, Alcance/Incluye 'Retención y eliminación'

El texto describe retención y eliminación: eliminación en un máximo de siete días, comprobante técnico de 90 días, trazabilidad anonimizada de unidades (la palabra "anonimizada" es obligatoria aquí) y excepción legal (DEC-127, DEC-128), purga de cuentas de dispositivo inactivas por 12 meses (DEC-224), logs operativos de 7 días (DEC-197) y portal de eliminación (DEC-129).

### REQ-17 `confirmed`
> Fuente: Request TAO-223, Alcance/Incluye 'Accesos administrativos auditados'

El texto declara los accesos administrativos auditados, incluida la impersonación para soporte (DEC-057, DEC-058).

### REQ-18 `confirmed`
> Fuente: Pedido de cambio punto 5; Adenda 2 punto 2

La comprobación en staging de si privacidad 1.0 ya está registrada en documento_legal y con qué hash NO es una tarea de código: la cubre el item de verificación con requiresHuman de la sesión 5 (verificación). Es solo lectura sobre documento_legal (tipo privacidad, versión 1.0) y su hash, sin ejecutar legal:registrar ni escribir en staging. Si no hay acceso a staging, queda como pendiente humano y no detiene S1, S2 ni S3.

### REQ-19 `confirmed` `enforcement`
> Fuente: Pedido de cambio (4); REQ-11, REQ-15, REQ-18

La tarea S3.T1 conserva dos salvaguardas: (a) al incorporar responsable y región de despliegue al texto no se inventan transferencias internacionales: solo se declara lo confirmado por escrito por Operación/release y asesoría legal; (b) no consulta ni escribe en staging (la comparación con documento_legal de staging es el item de verificación humana de la sesión 5, REQ-18).

### REQ-20 `confirmed` `enforcement`
> Fuente: Pedido de cambio (2); Adenda 3

Al reemplazar menciones de rutas obsoletas, cada ruta se reemplaza por separado y por su par correcto: docs/legal/aprobaciones-privacidad-v1.0.md pasa a docs/legal/aprobaciones/privacidad-v1.0.md y docs/legal/aprobaciones-terminos-v1.0.md pasa a docs/legal/aprobaciones/terminos-v1.0.md; una mención de términos nunca apunta al registro de privacidad.

### REQ-21 `confirmed`
> Fuente: Pedido de cambio, ajuste (1); REQ-05 (Adenda 3)

Rollback de S2.T1: 'git rm -f docs/legal/aprobaciones/privacidad-v1.0.md'. No se borra el directorio docs/legal/aprobaciones/ porque ya existe por terminos-v1.0.md (TAO-222).

### REQ-22 `confirmed` `enforcement`
> Fuente: Pedido de cambio, ajuste (2); REQ-20

El barrido de S1.T8 se acota a los archivos de este plan: docs/legal/privacidad-v1.0.md, sus copias en app/assets/legal/ y server/legal/, y los textos de las tareas y casos de este ticket. No se editan archivos de TAO-222 más allá de menciones de ruta (REQ-20) ni se barre el repo completo.

### REQ-23 `confirmed`
> Fuente: Pedido de cambio, ajuste (3); REQ-01, REQ-09

El hash SHA-256 que S2.T1 anota en docs/legal/aprobaciones/privacidad-v1.0.md se calcula con la regla de hash confirmada en S1.T1 (SHA-256 del archivo completo).
## Tasks

#### S1.T1 — (b) Confirmar en app/lib/features/legal/data/textos_legales_empaquetados.dart y app/test/legal/empaquetado_test.dart que el hash es SHA-256 del archivo completo calculado en ejecución y que no se guarda en ningún archivo (lectura previa ya lo indica; si el código dijera otra cosa, reportarlo antes de redactar). Tarea de SOLO LECTURA: no escribe ni reemplaza archivos; también verifica que app/test/legal/empaquetado_test.dart y scripts/ci/ep01-legal-provider.mjs comparan contra docs/legal/ y registra en sus notas la referencia (símbolo o función, sin número de línea) de puerto_analitica.dart que confirma opt_in sin red o sin política válida.
Contrato: rollback: Sin cambios en el repo; descartar las notas y el archivo de huella temporal.. Status: done

#### S1.T2 — Redactar el texto fuente de la política de privacidad v1 en docs/legal/privacidad-v1.0.md (reemplaza el archivo existente), cubriendo REQ-14, REQ-15, REQ-16, REQ-17, REQ-02 y REQ-12 sin contradecir las DEC citadas. En el apartado de analítica no escribir la palabra 'anónima', ni siquiera negada ('no anónima'), porque el verify de S1.T5 la rechaza; expresar DEC-058 como 'seudónima: se asocia a un identificador técnico y no a tu nombre o correo'. Mantener el encabezado YAML existente (patrón de terminos-v1.0.md).
Contrato: rollback: git checkout -- docs/legal/privacidad-v1.0.md. Status: done

#### S1.T3 — Redactar el resumen breve para V-51 como sección de docs/legal/privacidad-v1.0.md con el encabezado exacto '## Resumen' (terminos-v1.0.md no trae una sección de resumen que copiar: el título lo fija esta tarea). Se deriva del texto redactado en S1.T2 y debe mencionar 'cuenta de dispositivo', 'cuenta completa', 'seudónima' y 'eliminación', sin el patrón 'an[oó]nim[ao]s?'. Se ejecuta después de S1.T2.
Contrato: rollback: git checkout -- docs/legal/privacidad-v1.0.md. Status: done

#### S1.T4 — Dejar en el encabezado YAML de docs/legal/privacidad-v1.0.md el campo vigente_desde con el marcador provisional PENDIENTE-VIGENCIA, sin fecha inventada. Efecto buscado: legal:registrar (server/src/legal/registro-version.ts) rechaza el archivo hasta que se fije la fecha real, por lo que no se puede publicar por error. La propagacion a las copias la hace S1.T6.
Contrato: rollback: Revertir el encabezado de docs/legal/privacidad-v1.0.md con git checkout al estado previo.. Status: done

#### S1.T5 — Verificar el apartado de analítica de docs/legal/privacidad-v1.0.md: extraer la sección desde su encabezado ## hasta el siguiente encabezado de nivel ## (incluye subtítulos ###); debe ser no vacía, no contener el patrón insensible a mayúsculas 'an[oó]nim[ao]s?' (cubre plurales) y contener 'seud[oó]nim'. Corregir el texto si falla. No usar grep de 'anonim' sobre todo el archivo, porque 'anonimizada' es obligatoria en retención.
Contrato: rollback: git checkout -- docs/legal/privacidad-v1.0.md. Status: done

#### S1.T6 — Copiar docs/legal/privacidad-v1.0.md sin cambios a app/assets/legal/privacidad-v1.0.md y server/legal/privacidad-v1.0.md, en el mismo commit y la misma sesion. No hay hash que editar a mano: lo calculan textos_legales_empaquetados.dart y las suites de empaquetado. Sin scripts ni formatos nuevos.
Contrato: rollback: Revertir el commit de la tarea; las copias y los hashes vuelven juntos al estado previo.. Status: done

#### S1.T7 — Verificar el texto final de docs/legal/privacidad-v1.0.md: un apartado con titulo por cada tema del alcance (datos con cuenta de dispositivo, datos con cuenta completa, analitica, proveedores, retencion y eliminacion, accesos administrativos; REQ-14 a REQ-17), los plazos literales 7 dias, 90 dias y 12 meses, y la coincidencia de hash de la fuente con app/assets/legal y server/legal mediante cd app && flutter test test/legal/ y node scripts/ci/ep01-legal-provider.mjs. El contenido minimo de REQ-14 a REQ-17 (cifrado en reposo, impersonacion para soporte, portal de eliminacion, correo transaccional) se revisa de forma manual en el gate.
Contrato: rollback: No hay cambios de código; si el chequeo falla, corregir el texto de privacidad-v1.0.md y repropagar las copias en la misma sesión.. Status: done

#### S1.T8 — Reemplazar las menciones de rutas obsoletas por ruta, de forma separada: docs/legal/aprobaciones-privacidad-v1.0.md pasa a docs/legal/aprobaciones/privacidad-v1.0.md, y docs/legal/aprobaciones-terminos-v1.0.md pasa a docs/legal/aprobaciones/terminos-v1.0.md. Nunca apuntar una mención de términos al registro de privacidad ni al revés. No modificar el contenido de docs/legal/aprobaciones/terminos-v1.0.md.
Contrato: rollback: Revertir el commit de la corrección de rutas con git revert; no se borran versiones, hashes ni evidencia.. Status: done

#### S2.T1 — Crear el registro de aprobaciones de privacidad en docs/legal/aprobaciones/privacidad-v1.0.md (crear el directorio docs/legal/aprobaciones/ si no existe; NO usar la ruta obsoleta docs/legal/aprobaciones-privacidad-v1.0.md) con la estructura mínima de la Adenda 2 definida en REQ-05: encabezado con documento, versión 1.0, hash SHA-256 y vigencia (o marcador provisional); secciones por revisor (Asesoría legal con línea UE/EEE, Producto, Operación/release con región de despliegue); y comparación final de hash fuente vs app/assets vs server/legal vs staging.
Contrato: rollback: git rm -f docs/legal/aprobaciones/privacidad-v1.0.md (no borrar el directorio docs/legal/aprobaciones/: ya existe por terminos-v1.0.md).. Status: done

#### S2.T2 — Comprobar que las copias app/assets/legal/privacidad-v1.0.md y server/legal/privacidad-v1.0.md coinciden con la fuente docs/legal/privacidad-v1.0.md bajo la regla de hash vigente (confirmada en S1.T1), corriendo cd app && flutter test test/legal/ y node scripts/ci/ep01-legal-provider.mjs. El resultado de esa comparación se anota en la sección final de docs/legal/aprobaciones-privacidad-v1.0.md. Sin cmp byte a byte, sin scripts nuevos y sin ejecutar legal:registrar.
Contrato: rollback: Revertir la entrada de comparación en docs/legal/aprobaciones-privacidad-v1.0.md con git checkout.. Status: done

#### S2.T3 — Dejar el caso de revisión del contraste con docs/product/tecnologia/23_observabilidad_logs_debug_y_costos.md sección 3 y DEC-197 como sección '## Contraste con el redactor de logs' dentro de docs/legal/aprobaciones-privacidad-v1.0.md, con cada dato que la política declara excluido de logs y su resultado (coincide / contradicción).
Contrato: rollback: Descartar el caso de revisión; sin cambios en el texto de la política salvo correcciones puntuales revertibles con git checkout.. Status: done

#### S2.T4 — Leer docs/legal/aprobaciones/terminos-v1.0.md (solo lectura) y compararlo con docs/legal/aprobaciones/privacidad-v1.0.md. La estructura mínima de la Adenda 2 prevalece sobre el registro de términos de TAO-222: si hay diferencias de estructura se REPORTAN en las notas de la tarea; no se copian al registro de privacidad ni se alinea hacia abajo el de privacidad. No modificar el archivo de términos.
Contrato: rollback: No requiere reversión: es una comprobación de solo lectura; si se ajusta el registro, git checkout -- docs/legal/aprobaciones/privacidad-v1.0.md.. Status: done
## Verificacion runtime

No aplica verificacion automatica en runtime: el entregable es texto legal sin interfaz propia. La estructura de titulos sin saltos de nivel (REQ-06) la comprueba el verify de S1.T2. La lectura en V-51 (tablet en horizontal, QA-03a-15-03), el contraste con un evento real de staging (QA-03a-15-02), la comparacion de hash con staging y las aprobaciones son items de verificacion humana de la sesion 5.
## Cambios al modelo de datos

Ninguno.
## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-01 (edit) `confirmed`: Existe en docs/legal/privacidad-v1.0.md el texto fuente de la política de privacidad v1 en español (DEC-049), en Markdown, con versión, vige
- REQ-05 (edit) `inferred`: Queda un registro de aprobación de la política v1: asesoría legal (fecha, versión y observaciones resueltas, incluido el tratamiento en UE/E
- REQ-08 (add) `confirmed`: El encabezado del texto fuente lleva la fecha de vigencia como marcador provisional explícito (PENDIENTE-VIGENCIA) y no una fecha inventada.
- REQ-09 (add) `confirmed`: Antes de redactar, el ejecutor confirma en puerto_analitica.dart que opt_in rige sin red o sin política válida, y verifica que app/test/lega

**Tasks agregadas:**

- S1: Antes de redactar: ubicar puerto_analitica.dart y confirmar que opt_in rige sin red o sin política válida; verificar que app/test/legal/empaquetado_test.dart y scripts/ci/ep01-legal-provider.mjs comparan contra la fuente docs/legal/privacidad-v1.0.md (copias en app/assets/legal/privacidad-v1.0.md y server/legal/privacidad-v1.0.md). Solo lectura: si algo no coincide, reportar sin modificar. (valida: REQ-09, REQ-02; rollback: No aplica: solo lectura, no cambia archivos.)
- S1: Dejar en el encabezado de docs/legal/privacidad-v1.0.md la vigencia como marcador provisional PENDIENTE-VIGENCIA (sin inventar fecha) y propagar el texto a las copias app/assets/legal/privacidad-v1.0.md y server/legal/privacidad-v1.0.md con el mecanismo de TAO-222. El hash se recalcula al fijar la fecha real. (valida: REQ-08, REQ-04, REQ-07; rollback: Restaurar la revisión anterior del archivo de texto versionado con git (checkout del archivo); se reemplaza un archivo de texto y no se borra ningún dato existente.)
- S1: Revisión manual del apartado de analítica: usa "seudónima" y nunca "anónima" para las métricas (DEC-058). No hacer grep de "anónim" sobre todo el archivo: "anonimizada" es obligatoria en el apartado de retención (REQ-01 d, DEC-127, DEC-128) y no debe quitarse. (valida: REQ-02, REQ-01; rollback: Restaurar la revisión anterior del archivo de texto versionado con git; no se borran datos.)
- S3: Paso manual posterior a la aprobación legal: fijar la fecha de vigencia real, recalcular el hash, propagarlo al encabezado y a las copias empaquetadas, y comparar el hash contra la fila de documento_legal de staging. No automatizable; registrar el resultado en el registro de aprobación (REQ-05). (valida: REQ-05, REQ-08, REQ-04; rollback: Volver al marcador provisional y a la revisión anterior del texto versionado con git; no se borran versiones, hashes ni evidencia de aceptación.)

**Task ops:**

- edit S1.T1.2 { verify=[] }
- edit S1.T3 { verify=[] }

### Enmienda 2
**REQs:**

- REQ-04 (edit) `confirmed`: Las copias empaquetadas del texto en app/assets/legal/privacidad-v1.0.md y server/legal/privacidad-v1.0.md coinciden en hash con la fuente d
- REQ-05 (edit) `inferred`: Queda un registro de aprobación de la política v1: asesoría legal (fecha, versión y observaciones resueltas, incluido el tratamiento en UE/E
- REQ-02 (edit) `confirmed`: El apartado de analítica dice que es propia y sin terceros (DEC-171), seudónima y nunca anónima (DEC-058), opt_in en UE/EEE y en región desc
- REQ-08 (edit) `confirmed`: El encabezado del texto fuente lleva la fecha de vigencia como marcador provisional explícito (PENDIENTE-VIGENCIA) y no una fecha inventada.
- REQ-09 (edit) `confirmed`: Antes de redactar, el ejecutor confirma en puerto_analitica.dart que opt_in rige sin red o sin política válida, y verifica que app/test/lega
- REQ-10 (add) `confirmed`: El texto de la política se contrasta con el redactor de logs (tecnologia/23 §3) y con DEC-197: el registro de errores sin datos personales y
- REQ-11 (add) `confirmed`: Al cerrar la sesión 3, el hash final con la vigencia real es idéntico en la fuente docs/legal/privacidad-v1.0.md, en las copias app/assets/l

**Tasks agregadas:**

- S1: Propagar el texto de docs/legal/privacidad-v1.0.md a app/assets/legal/privacidad-v1.0.md y server/legal/privacidad-v1.0.md y actualizar el hash que consumen textos_legales_empaquetados.dart y la suite del servidor, todo en el mismo commit y la misma sesión. Usar la regla de hash (archivo completo o sin encabezado) confirmada en S1.T4. El gate de S1 exige que pasen cd app && flutter test test/legal/ y node scripts/ci/ep01-legal-provider.mjs. (valida: REQ-04, REQ-09; rollback: Revertir el commit único que toca fuente, copias y hash, volviendo a la versión previa que pasa los chequeos.)
- S2: Caso de revisión: contrastar el texto de la política (apartados de proveedores, registro de errores y logs operativos de 7 días) con el redactor de logs (tecnologia/23 §3) y con DEC-197. Registrar el resultado y cualquier contradicción en el registro de aprobación. No crear scripts ni formatos nuevos. (valida: REQ-10; rollback: Retirar la entrada de revisión del registro de aprobación; no altera el texto publicado.)
- S3: Con la vigencia real fijada tras la aprobación legal, recalcular el hash (regla confirmada en S1.T4), actualizarlo en el encabezado, las copias y textos_legales_empaquetados.dart en un solo commit, y comparar el hash final con la fila de documento_legal de staging. Registrar en el registro de aprobación el hash idéntico en fuente, copias y staging (reviewOutcome observable de S3). (valida: REQ-08, REQ-11, REQ-05; rollback: Revertir el commit de vigencia y hash; conservar vigente solo la versión previamente aprobada, sin borrar hashes ni evidencia de aceptación.)

**Task ops:**

- edit S1.T4 { desc="PRIMERA tarea de la sesión 1; las demás dependen de ella. Antes de redactar, confirmar en puerto_analitica.dart que opt_in rige sin red o sin política válida (citando las líneas leídas, sin fijar números de antemano), verificar que app/test/legal/empaquetado_test.dart y scripts/ci/ep01-legal-provider.mjs comparan contra docs/legal/privacidad-v1.0.md, y confirmar en textos_legales_empaquetados.dart si el hash se calcula sobre el archivo completo o sin encabezado. No crear scripts ni formatos nuevos.", validates=["REQ-02","REQ-09"] }

### Enmienda 3
**REQs:**

- REQ-02 (edit) `confirmed`: El apartado de analítica dice que es propia y sin terceros (DEC-171), seudónima y nunca anónima (DEC-058), opt_in en UE/EEE y en región desc
- REQ-04 (edit) `confirmed`: Las copias empaquetadas del texto en app/assets/legal/privacidad-v1.0.md y server/legal/privacidad-v1.0.md coinciden en hash con la fuente d
- REQ-11 (edit) `confirmed`: La sesión 3 queda declarada bloqueada por pendientes externos: fecha de vigencia real, aprobación legal, identidad legal del responsable y r
- REQ-12 (add) `confirmed`: El texto o el registro de aprobación deja documentado que un tratamiento nuevo agregado en M2 u otro hito exige una versión nueva de la polí
- REQ-13 (add) `confirmed`: La fila de documento_legal (tipo privacidad, versión 1.0) la registra el pipeline según DEC-222 (HU-03a-10); este ticket no crea fila ni see

**Tasks agregadas:**

- S1: Dejar documentado en el texto fuente docs/legal/privacidad-v1.0.md (sección de vigencia o cambios) o en el registro de aprobación que un tratamiento nuevo en M2 u otro hito exige versión nueva con exige_reaceptacion. Si se edita el texto fuente, la propagación a copias y hash la cubre S1.T7. (valida: REQ-12; rollback: Revertir con git el párrafo agregado al texto o al registro.)

**Task ops:**

- delete S2.T1
- delete S3.T1
- edit S1.T1 { desc="Crear la fuente docs/legal/privacidad-v1.0.md siguiendo el formato de encabezado (versión, vigencia, hash) de docs/legal/terminos-v1.0.md (TAO-222). La fuente se redacta y queda definitiva en S1; no se reemplaza en S2. La propagación a copias y hash se hace en S1.T7.", verify=["git diff --stat -- docs/legal/privacidad-v1.0.md"] }
- edit S1.T2 { desc="Buscar el resumen breve para V-51 de términos en docs/legal/terminos-v1.0.md (sección de resumen); el ejecutor confirma la ruta real antes de usarlo como patrón. Redactar el resumen breve de privacidad con el mismo formato, coherente con el texto completo y su versión.", verify=[] }
- edit S1.T3 { desc="Redactar el apartado de analítica (propia y sin terceros, seudónima, opt_in/opt_out/disabled por región, cambio desde Cuenta). Verificar buscando \"anónima\" dentro del apartado de analítica; no usar grep de \"anonim\" sobre todo el archivo, porque \"anonimizada\" es obligatoria en retención.", verify=[] }
- edit S1.T4 { desc="Leer app puerto_analitica.dart y confirmar que opt_in rige sin red o sin política válida. Registrar la referencia de línea que se confirme al leerlo y citarla de forma idéntica en el REQ-02 y en su caso de prueba [edge]; no usar puerto_analitica.dart:291-293 de antemano.", verify=[] }
- edit S1.T5 { desc="Limitar el encabezado del texto fuente a la fecha de vigencia como marcador provisional PENDIENTE-VIGENCIA, sin fecha inventada. La propagación a copias y la actualización del hash se delegan a S1.T7.", verify=["git diff --stat -- docs/legal/privacidad-v1.0.md"] }
- edit S1.T6 { desc="Revisar el texto contra el criterio de analítica: buscar \"anónima\" solo en el apartado de analítica y confirmar que no aparece; no usar grep de \"anonim\" sobre todo el archivo, y conservar \"anonimizada\" en la trazabilidad de unidades.", verify=[] }
- edit S1.T7 { desc="Propagar la fuente a app/assets/legal/privacidad-v1.0.md y server/legal/privacidad-v1.0.md y actualizar el hash que consumen textos_legales_empaquetados.dart y la suite del servidor, en el mismo commit y sesión (incluye el marcador PENDIENTE-VIGENCIA de S1.T5). Gate de S1 y su reviewOutcome: deben pasar cd app && flutter test test/legal/ y node scripts/ci/ep01-legal-provider.mjs.", verify=["cd app && flutter test test/legal/","node scripts/ci/ep01-legal-provider.mjs"] }

### Enmienda 4
**REQs:**

- REQ-01 (edit) `confirmed`: Existe en docs/legal/privacidad-v1.1.md el texto fuente de la política de privacidad en español (DEC-049), en Markdown, con versión, vigenci
- REQ-02 (edit) `confirmed`: El apartado de analítica dice que es propia y sin terceros (DEC-171), seudónima y nunca anónima (DEC-058), opt_in en UE/EEE y en región desc
- REQ-03 (edit) `inferred`: El resumen breve de la política de privacidad para V-51 vive en la sección de resumen del mismo texto fuente docs/legal/privacidad-v1.1.md, 
- REQ-04 (edit) `confirmed`: Las copias empaquetadas del texto en app/assets/legal/privacidad-v1.1.md y server/legal/privacidad-v1.1.md coinciden en hash con la fuente d
- REQ-05 (edit) `inferred`: Queda un registro de aprobación de la política (versión 1.1): asesoría legal (fecha, versión y observaciones resueltas, incluido el tratamie
- REQ-08 (edit) `confirmed`: El encabezado del texto fuente lleva la fecha de vigencia como marcador provisional explícito (PENDIENTE-VIGENCIA) y no una fecha inventada;
- REQ-09 (edit) `confirmed`: Antes de redactar, S1.T1 (primera tarea de la sesión 1) verifica que app/test/legal/empaquetado_test.dart y scripts/ci/ep01-legal-provider.m
- REQ-11 (edit) `confirmed`: La sesión 3 queda declarada bloqueada por pendientes externos: fecha de vigencia real, aprobación legal, identidad legal del responsable y r
- REQ-13 (edit) `confirmed`: Sin cambios al modelo de datos: la fila de documento_legal (tipo privacidad, versión 1.1) la registra el pipeline legal:registrar según DEC-

**Task ops:**

- edit S1.T1 { desc="Lectura y confirmaciones previas (primera tarea de la sesión 1, sin escribir archivos): (1) verificar que app/test/legal/empaquetado_test.dart y scripts/ci/ep01-legal-provider.mjs comparan contra docs/legal/; (2) confirmar en textos_legales_empaquetados.dart si el hash se calcula sobre el archivo completo o sin el encabezado y registrar la regla; (3) leer puerto_analitica.dart y registrar la referencia (símbolo o función, sin número de línea fijo) que confirma opt_in sin red o sin política válida; (4) consultar la tabla documento_legal de staging para saber si privacidad 1.0 ya está registrada. Regla de versión: docs/legal/README.md dice que una versión publicada no se edita y legal:registrar rechaza republicar otro texto; si privacidad 1.0 está registrada, el texto definitivo sale como privacidad-v1.1.md (valor por defecto si no se puede verificar: 1.1). Esta consulta fija el nombre y la versión finales de privacidad-v1.1.md en docs/legal/, app/assets/legal/ y server/legal/. S1.T7 y S3.T2 usan la regla de hash confirmada aquí.", rollback="No aplica: solo lectura", validates=["REQ-09","REQ-02","REQ-04"], isTest=false, verify=["test -f app/test/legal/empaquetado_test.dart","test -f scripts/ci/ep01-legal-provider.mjs"] }
- edit S1.T4 { desc="Redactar el texto fuente docs/legal/privacidad-v1.1.md (nombre y versión finales según la consulta de S1.T1), en español neutro, con jerarquía de títulos Markdown sin saltos de nivel y sin tablas anchas. Subtarea S1.T4.1: apartados de datos por cuenta de dispositivo y cuenta completa, proveedores, retención y eliminación (con la palabra \"anonimizada\" en la trazabilidad de unidades) y accesos administrativos auditados, según REQ-01. Subtarea S1.T4.2: apartado de analítica propia y sin terceros, seudónima, opt_in en UE/EEE y región desconocida, opt_out o disabled según la región, cambiable desde Cuenta, coherente con la referencia registrada en S1.T1 (REQ-02). Incluir la nota de que un tratamiento nuevo exige versión nueva con exige_reaceptacion (REQ-12). Sin tocar documento_legal.", rollback="Revertir el commit que agrega docs/legal/privacidad-v1.1.md, sin borrar versiones previas.", validates=["REQ-01","REQ-02","REQ-06","REQ-12"], isTest=false, verify=["test -f docs/legal/privacidad-v1.1.md"] }
- edit S1.T2 { desc="Redactar el resumen breve para V-51 dentro de la sección de resumen de docs/legal/privacidad-v1.1.md, tomando como modelo la sección de resumen de docs/legal/terminos-v1.0.md (buscarla allí y replicar su estructura). El resumen es coherente con el texto completo y lleva la misma versión; no se crea un archivo aparte.", rollback="Revertir el cambio del texto fuente docs/legal/privacidad-v1.1.md (el resumen vive en la misma sección del archivo).", validates=["REQ-03","REQ-07"], isTest=false, verify=["grep -n -i 'resumen' docs/legal/privacidad-v1.1.md"] }
- edit S1.T5 { desc="Dejar en el encabezado de docs/legal/privacidad-v1.1.md el marcador PENDIENTE-VIGENCIA en el campo de vigencia, sin inventar fecha. No propaga a copias ni recalcula hash: eso lo hace S1.T7.", rollback="Revertir el cambio del encabezado de docs/legal/privacidad-v1.1.md.", validates=["REQ-08"], isTest=false, verify=["grep -n 'PENDIENTE-VIGENCIA' docs/legal/privacidad-v1.1.md"] }
- edit S1.T6 { desc="Verificar que la palabra \"anónima\" no aparece dentro del apartado de analítica de docs/legal/privacidad-v1.1.md y que sí aparece \"seudónima\" (DEC-058). La búsqueda se limita a ese apartado; no usar grep de \"anonim\" sobre todo el archivo porque \"anonimizada\" es obligatoria en retención. Esta es la única tarea que hace esta verificación.", rollback="No aplica: solo verificación.", validates=["REQ-02"], isTest=true, verify=["awk '/^#+ .*[Aa]nal/{f=1;next} /^#+ /{f=0} f' docs/legal/privacidad-v1.1.md | grep -ciw 'anónima'"] }
- edit S1.T7 { desc="Propagar docs/legal/privacidad-v1.1.md a app/assets/legal/privacidad-v1.1.md y server/legal/privacidad-v1.1.md (nombre final según S1.T1), calcular el hash con la regla confirmada en S1.T1 (archivo completo o sin encabezado) y actualizarlo en el encabezado, en textos_legales_empaquetados.dart y en la suite del servidor, todo en el mismo commit y la misma sesión. Sin scripts ni formatos nuevos.", rollback="Revertir el commit de propagación, restaurando copias y hash previos.", validates=["REQ-04","REQ-08"], isTest=false, verify=["cd app && flutter test test/legal/","node scripts/ci/ep01-legal-provider.mjs"] }
- edit S2.T2 { desc="Registrar el registro de aprobación de la política de privacidad versión 1.1: asesoría legal (fecha, versión 1.1 y observaciones resueltas, incluido el tratamiento en UE/EEE), aceptación funcional de Producto y confirmación de Operación/release sobre la ubicación de la infraestructura, asociado a la versión y al hash. Documentar que un tratamiento nuevo en M2 u otro hito exige versión nueva con exige_reaceptacion. No crea fila de documento_legal.", rollback="Revertir el commit del registro de aprobación; no se borran versiones ni hashes previos.", validates=["REQ-05","REQ-12","REQ-13"], isTest=false, verify=[] }
- edit S3.T2 { desc="Con la vigencia real fijada y la aprobación legal obtenida, recalcular el hash con la regla confirmada en S1.T1 y comprobar que es idéntico en docs/legal/privacidad-v1.1.md, app/assets/legal/privacidad-v1.1.md, server/legal/privacidad-v1.1.md y la fila de documento_legal de staging. Registrar la comparación en el registro de aprobación. Bloqueada por pendientes externos: vigencia real, aprobación legal, identidad legal del responsable, región de Railway y acceso a staging.", rollback="Revertir el commit con la vigencia y el hash finales, restaurando el marcador PENDIENTE-VIGENCIA y el hash previo.", validates=["REQ-08","REQ-11"], isTest=false, verify=["cd app && flutter test test/legal/","node scripts/ci/ep01-legal-provider.mjs"] }

### Enmienda 5
**REQs:**

- REQ-02 (edit) `confirmed`: El apartado de analítica dice que es propia y sin terceros (DEC-171), seudónima y nunca anónima (DEC-058), opt_in en UE/EEE y en región desc
- REQ-03 (edit) `inferred`: El resumen breve de la política de privacidad para V-51 vive en la sección de resumen del mismo texto fuente docs/legal/privacidad-v1.1.md, 
- REQ-04 (edit) `confirmed`: Las copias empaquetadas del texto en app/assets/legal/privacidad-v1.1.md y server/legal/privacidad-v1.1.md coinciden en hash con la fuente d
- REQ-08 (edit) `confirmed`: El encabezado del texto fuente lleva la fecha de vigencia como marcador provisional explícito (PENDIENTE-VIGENCIA) y no una fecha inventada;
- REQ-09 (edit) `confirmed`: Antes de redactar, S1.T1 (primera tarea de la sesión 1) verifica que app/test/legal/empaquetado_test.dart y scripts/ci/ep01-legal-provider.m

**Task ops:**

- edit S1.T2 { desc="Redactar el resumen breve para V-51 en la sección de resumen de docs/legal/privacidad-v1.1.md, siguiendo la estructura de la sección de resumen de docs/legal/terminos-v1.0.md. Dependencia explícita: se ejecuta después de S1.T3 (redacción del texto fuente), porque el resumen se deriva del texto redactado y debe ser coherente con él y con su misma versión. S1.T1 sigue siendo la primera tarea de la sesión. No crear un archivo aparte para el resumen.", validates=["REQ-03"], verify=["cd app && flutter test test/legal/"] }

### Enmienda 6
**REQs:**

- REQ-01 (edit) `confirmed`: Existe en docs/legal/privacidad-v1.0.md el texto fuente de la política de privacidad en español (DEC-049), en Markdown, con versión, vigenci
- REQ-02 (edit) `confirmed`: El apartado de analítica dice que es propia y sin terceros (DEC-171), seudónima y nunca anónima (DEC-058), opt_in en UE/EEE y en región desc
- REQ-03 (edit) `inferred`: El resumen breve de la política de privacidad para V-51 vive en la sección de resumen del mismo texto fuente docs/legal/privacidad-v1.0.md, 
- REQ-04 (edit) `confirmed`: Las copias empaquetadas del texto en app/assets/legal/privacidad-v1.0.md y server/legal/privacidad-v1.0.md coinciden en hash con la fuente d
- REQ-05 (edit) `inferred`: Queda el registro de aprobaciones docs/legal/aprobaciones-privacidad-v1.0.md, con el mismo formato que el registro de términos de TAO-222 (e
- REQ-08 (edit) `confirmed`: El encabezado del texto fuente lleva la fecha de vigencia como marcador provisional explícito (PENDIENTE-VIGENCIA) y no una fecha inventada;
- REQ-09 (edit) `confirmed`: Antes de redactar, S1.T1 (primera tarea de la sesión 1) verifica que app/test/legal/empaquetado_test.dart y scripts/ci/ep01-legal-provider.m
- REQ-11 (edit) `confirmed`: La sesión 3 queda declarada bloqueada por pendientes externos: fecha de vigencia real, aprobación legal, identidad legal del responsable y r
- REQ-13 (edit) `confirmed`: Sin cambios al modelo de datos: la fila de documento_legal (tipo privacidad, versión 1.0) la registra el pipeline legal:registrar según DEC-

**Task ops:**

- edit S1.T1 { desc="Primera tarea de la sesión. Verificar sin escribir: (1) app/test/legal/empaquetado_test.dart y scripts/ci/ep01-legal-provider.mjs comparan contra docs/legal/; (2) en textos_legales_empaquetados.dart, si el hash se calcula sobre el archivo completo o sin el encabezado; (3) leer puerto_analitica.dart y registrar la referencia (símbolo o función, sin número de línea fijo) que confirma opt_in sin red o sin política válida; (4) consultar en staging, SOLO LECTURA por el túnel (railway connect postgres --tunnel-only), si privacidad 1.0 está registrada en documento_legal o tiene aceptaciones. Si lo está o no se puede verificar, DETENERSE y consultar al dev antes de usar 1.1 (no es valor por defecto). Reemplazar docs/legal/privacidad-v1.0.md según la Adenda 1. S1.T6 y S3.T1 usan la regla de hash confirmada aquí. No ejecutar legal:registrar.", rollback="No hay cambios de archivos que revertir; la tarea solo lee. Descartar las notas de verificación si se rehace.", verify=["grep -q \"docs/legal\" app/test/legal/empaquetado_test.dart","grep -q \"docs/legal\" scripts/ci/ep01-legal-provider.mjs"] }
- edit S1.T2 { desc="Redactar la sección de resumen breve para V-51 dentro de docs/legal/privacidad-v1.0.md, con la estructura de la sección de resumen de docs/legal/terminos-v1.0.md. Depende de S1.T3: se deriva del texto ya redactado y su verify no corre antes de esa redacción. Plazos y términos deben coincidir con el texto completo.", rollback="Quitar la sección de resumen de docs/legal/privacidad-v1.0.md con git checkout del archivo al estado previo a la tarea.", verify=["bash -c 'grep -qiE \"^#+ .*resumen\" docs/legal/privacidad-v1.0.md && grep -q \"90 días\" docs/legal/privacidad-v1.0.md && grep -q \"12 meses\" docs/legal/privacidad-v1.0.md'"] }
- edit S1.T3 { desc="Redactar el texto completo de docs/legal/privacidad-v1.0.md (reemplaza el archivo, no crea v1.1) en dos partes de la misma tarea. Parte (a): datos por tipo de cuenta, analítica por región (usar seudónima, nunca anónima) y proveedores. Parte (b): retención y eliminación (con \"anonimizada\" en trazabilidad de unidades), accesos administrativos auditados con impersonación, nota de que un tratamiento nuevo en M2 u otro hito exige versión nueva con exige_reaceptacion (REQ-12), y declaración de la identidad legal del responsable y la región de Railway como pendientes externos que no bloquean la redacción. Jerarquía de títulos sin saltos y sin tablas anchas.", rollback="Restaurar docs/legal/privacidad-v1.0.md al estado previo con git checkout; no tocar copias empaquetadas.", verify=["bash -c 'grep -q \"exige_reaceptacion\" docs/legal/privacidad-v1.0.md && grep -q \"anonimizada\" docs/legal/privacidad-v1.0.md'"] }
- edit S1.T4 { desc="Dejar en el encabezado de docs/legal/privacidad-v1.0.md la vigencia como marcador provisional PENDIENTE-VIGENCIA, sin fecha inventada. El hash se recalcula cuando se fije la vigencia real; la propagación a las copias la hace S1.T6.", rollback="Revertir el encabezado de docs/legal/privacidad-v1.0.md con git checkout al estado previo.", verify=["grep -q \"PENDIENTE-VIGENCIA\" docs/legal/privacidad-v1.0.md"] }
- edit S1.T5 { verify=["bash -c 'sec=$(awk \"/^#+ .*[Aa]n[aá]l[ií]tica/{f=1;next} /^#+ /{f=0} f\" docs/legal/privacidad-v1.0.md); test -n \"$sec\" && test \"$(printf \"%s\" \"$sec\" | grep -ciE \"an[oó]nim[ao]\\b\")\" -eq 0 && printf \"%s\" \"$sec\" | grep -qi \"seud[oó]nima\"'"] }
- edit S1.T6 { desc="Con la regla de hash confirmada en S1.T1, copiar docs/legal/privacidad-v1.0.md a app/assets/legal/privacidad-v1.0.md y server/legal/privacidad-v1.0.md y actualizar el hash que consumen textos_legales_empaquetados.dart y la suite del servidor, en el mismo commit y la misma sesión. Sin scripts ni formatos nuevos.", rollback="Revertir el commit de la tarea; las copias y los hashes vuelven juntos al estado previo.", verify=["cd app && flutter test test/legal/","node scripts/ci/ep01-legal-provider.mjs"] }
- edit S2.T1 { desc="Crear docs/legal/aprobaciones-privacidad-v1.0.md con el mismo formato que el registro de términos de TAO-222 (estado pendiente, versión 1.0, hash, fecha y observaciones) y tres entradas: asesoría legal (incluye tratamiento en UE/EEE, P-227), aceptación funcional de Producto y confirmación de Operación/release sobre la ubicación de la infraestructura. Registrar también ahí que un tratamiento nuevo en M2 u otro hito exige versión nueva con exige_reaceptacion (REQ-12). Adjuntarlo a GH-94 lo confirma el dev aparte.", rollback="Eliminar docs/legal/aprobaciones-privacidad-v1.0.md con git; no afecta texto ni copias.", verify=["bash -c 'test -f docs/legal/aprobaciones-privacidad-v1.0.md && grep -q \"exige_reaceptacion\" docs/legal/aprobaciones-privacidad-v1.0.md'"] }
- edit S2.T2 { desc="Contrastar el hash de docs/legal/privacidad-v1.0.md con las copias app/assets/legal/ y server/legal/ usando la regla de hash confirmada en S1.T1 (no shasum del archivo completo salvo que esa regla sea justamente archivo completo), y registrar el resultado en docs/legal/aprobaciones-privacidad-v1.0.md. La detección de discrepancias es humana; no hay bloqueo automático.", rollback="Revertir la entrada de comparación en docs/legal/aprobaciones-privacidad-v1.0.md con git checkout.", verify=["bash -c 'cmp docs/legal/privacidad-v1.0.md app/assets/legal/privacidad-v1.0.md && cmp docs/legal/privacidad-v1.0.md server/legal/privacidad-v1.0.md'","cd app && flutter test test/legal/","node scripts/ci/ep01-legal-provider.mjs"] }
- edit S2.T3 { desc="Dejar en docs/legal/aprobaciones-privacidad-v1.0.md las entradas de aceptación funcional de Producto y de confirmación de Operación/release (ubicación de la infraestructura) listas para completar por escrito, asociadas a la versión 1.0 y al hash, con estado pendiente hasta que respondan. Adjuntarlo a GH-94 lo confirma el dev aparte.", rollback="Revertir las entradas con git checkout de docs/legal/aprobaciones-privacidad-v1.0.md.", verify=["bash -c 'grep -qi \"Producto\" docs/legal/aprobaciones-privacidad-v1.0.md && grep -qi \"Operaci\" docs/legal/aprobaciones-privacidad-v1.0.md'"] }
- edit S3.T1 { desc="Bloqueada por pendientes externos (vigencia real, aprobación legal, identidad del responsable, región de Railway, acceso a staging en solo lectura por el túnel). Al fijarse la vigencia real, reemplazar PENDIENTE-VIGENCIA, recalcular el hash con la regla confirmada en S1.T1 y actualizarlo en docs/legal/privacidad-v1.0.md, app/assets/legal/privacidad-v1.0.md, server/legal/privacidad-v1.0.md y en el hash que consumen textos_legales_empaquetados.dart y la suite del servidor, en un solo commit. Comparar con la fila de documento_legal de staging (solo lectura) y registrar la comparación en docs/legal/aprobaciones-privacidad-v1.0.md. No ejecutar legal:registrar.", rollback="Revertir el commit de la tarea; vuelve el marcador PENDIENTE-VIGENCIA y el hash previo en todas las copias.", verify=["cd app && flutter test test/legal/","node scripts/ci/ep01-legal-provider.mjs"] }

### Enmienda 7

**Task ops:**

- edit S2.T3 { desc="Caso de revisión que contrasta el texto de la política en docs/legal/privacidad-v1.0.md (apartados de proveedores, registro de errores y logs operativos de 7 días) con el redactor de logs (tecnologia/23 §3) y con DEC-197. Verifica que lo descrito en la política no contradiga lo que el redactor omite o enmascara. Registra el resultado de la comparación y cualquier contradicción encontrada en docs/legal/aprobaciones-privacidad-v1.0.md. La creación de las entradas de Producto y Operación/release es de S2.T1 (que ya crea las tres entradas), no de esta tarea. Sin scripts ni formatos nuevos.", rollback="Revertir con git el cambio de esta tarea en docs/legal/aprobaciones-privacidad-v1.0.md (el registro del resultado de la comparación), sin tocar las entradas creadas por S2.T1 ni el texto de docs/legal/privacidad-v1.0.md.", validates=["REQ-10"], isTest=false, verify=["grep -n -i \"redactor\" docs/legal/aprobaciones-privacidad-v1.0.md"] }

### Enmienda 8
**REQs:**

- REQ-01 (edit) `confirmed`: Existe en docs/legal/privacidad-v1.0.md el texto fuente de la política de privacidad en español (DEC-049), en Markdown, con versión, vigenci
- REQ-14 (add) `confirmed`: El texto describe los datos por tipo de cuenta. Cuenta de dispositivo: las consultas quedan solo en el teléfono y al servidor llegan identid
- REQ-15 (add) `confirmed`: El texto declara los proveedores que tratan datos: alojamiento del servidor y base (DEC-164, DEC-195), registro de errores sin datos persona
- REQ-16 (add) `confirmed`: El texto describe retención y eliminación: eliminación en un máximo de siete días, comprobante técnico de 90 días, trazabilidad anonimizada 
- REQ-17 (add) `confirmed`: El texto declara los accesos administrativos auditados, incluida la impersonación para soporte (DEC-057, DEC-058).

**Tasks agregadas:**

- S1: Verificar en docs/legal/privacidad-v1.0.md que existe un apartado por cada tema (datos por tipo de cuenta, analítica, proveedores, retención y eliminación, accesos administrativos, resumen para V-51), que los plazos 7 días, 90 días y 12 meses figuran literales, y que las tres copias (docs/legal, app/assets/legal, server/legal) coinciden en hash. No crear scripts nuevos: usa grep sobre el archivo y los chequeos existentes. No ejecutar legal:registrar. (valida: REQ-14, REQ-15, REQ-16, REQ-17, REQ-04, test; rollback: No hay cambios de código; si el chequeo falla, corregir el texto de privacidad-v1.0.md y repropagar las copias en la misma sesión.)

### Enmienda 9
**REQs:**

- REQ-01 (edit) `confirmed`: Existe en docs/legal/privacidad-v1.0.md el texto fuente de la política de privacidad en español (DEC-049), en Markdown, con versión, vigenci
- REQ-02 (edit) `confirmed`: El apartado de analítica dice que es propia y sin terceros (DEC-171), seudónima y nunca anónima (DEC-058), opt_in en UE/EEE y en región desc
- REQ-05 (edit) `confirmed`: Queda el registro de aprobaciones docs/legal/aprobaciones-privacidad-v1.0.md, cuyo formato lo define esta historia (Adenda 2): encabezado co
- REQ-06 (edit) `inferred`: El texto tiene una jerarquía de títulos Markdown sin saltos de nivel, para lector de pantalla y lectura en teléfono y tablet, sin tablas anc
- REQ-09 (edit) `confirmed`: S1.T1 es de SOLO LECTURA y es la primera tarea de la sesión 1: verifica que app/test/legal/empaquetado_test.dart y scripts/ci/ep01-legal-pro
- REQ-10 (edit) `confirmed`: El texto de la política se contrasta con el redactor de logs (docs/product/tecnologia/23_observabilidad_logs_debug_y_costos.md, sección 3) y
- REQ-18 (add) `confirmed`: Una tarea de S1 comprueba en staging si privacidad 1.0 ya está registrada en documento_legal y con qué hash. Si el ejecutor no tiene acceso 

**Tasks agregadas:**

- S1: Comprobar en staging si privacidad 1.0 ya esta registrada y con que hash. Solo lectura por el túnel (railway connect postgres --tunnel-only): consultar documento_legal (tipo privacidad, versión 1.0) y sus aceptaciones. Si no hay acceso de solo lectura a staging, NO se detiene: se continúa con v1.0 y la comprobación queda como pendiente humano (verificación con requiresHuman). No ejecutar legal:registrar ni escribir en staging. (valida: REQ-18, REQ-09; rollback: Sin cambios de código ni datos; descartar las notas de la comprobación.)

**Task ops:**

- edit S1.T1 { desc="SOLO LECTURA, sin modificar archivos. Verificar que app/test/legal/empaquetado_test.dart y scripts/ci/ep01-legal-provider.mjs comparan contra docs/legal/. Confirmar en textos_legales_empaquetados.dart si el hash se calcula sobre el archivo completo o sin el encabezado. Leer puerto_analitica.dart y registrar en las notas de S1.T1 y en el caso de prueba la referencia (símbolo o función, sin número de línea fijo) que confirma opt_in sin red o sin política válida. legal:registrar no se ejecuta.", rollback="Sin cambios en el repo; descartar las notas.", validates=["REQ-09","REQ-02"], isTest=false, verify=["git status --porcelain docs/legal app/assets/legal server/legal"] }
- edit S1.T2 { desc="Redactar el texto fuente docs/legal/privacidad-v1.0.md (reemplazando el archivo, Adenda 1) en español, con títulos ## para: datos con cuenta de dispositivo, datos con cuenta completa (REQ-14), analítica (REQ-02), proveedores (REQ-15), retención y eliminación con '7 días', '90 días', '12 meses' y 'anonimizada' (REQ-16), accesos administrativos con impersonación (REQ-17), y la nota de que un tratamiento nuevo exige versión nueva con exige_reaceptacion (REQ-12). Jerarquía de títulos sin saltos (REQ-06). Sin nombrar la región de Railway ni inventar transferencias.", rollback="git checkout -- docs/legal/privacidad-v1.0.md", validates=["REQ-01","REQ-02","REQ-06","REQ-12","REQ-14","REQ-15","REQ-16","REQ-17"], isTest=false, verify=["grep -Eiq '^#+ .*retenci(o|ó)n y eliminaci(o|ó)n' docs/legal/privacidad-v1.0.md"] }
- edit S1.T3 { desc="Redactar la sección de resumen breve para V-51 dentro de docs/legal/privacidad-v1.0.md, siguiendo la estructura de la sección de resumen de docs/legal/terminos-v1.0.md, derivada del texto ya redactado en S1.T2 y coherente con él y con la versión 1.0. No se crea archivo aparte.", rollback="git checkout -- docs/legal/privacidad-v1.0.md", validates=["REQ-03"], isTest=false, verify=["sec=$(awk '/^## /{p=(tolower($0) ~ /resumen/)} p' docs/legal/privacidad-v1.0.md); test -n \"$sec\" && echo \"$sec\" | grep -Eiq '7 d(i|í)as' && echo \"$sec\" | grep -Eiq '90 d(i|í)as' && echo \"$sec\" | grep -Eiq '12 meses'"] }
- edit S1.T5 { desc="Verificar el apartado de analítica de docs/legal/privacidad-v1.0.md: extraer la sección desde su encabezado ## hasta el siguiente encabezado de nivel ## (incluye subtítulos ###); debe ser no vacía, no contener el patrón insensible a mayúsculas 'an[oó]nim[ao]s?' (cubre plurales) y contener 'seud[oó]nim'. Corregir el texto si falla. No usar grep de 'anonim' sobre todo el archivo, porque 'anonimizada' es obligatoria en retención.", rollback="git checkout -- docs/legal/privacidad-v1.0.md", validates=["REQ-02"], isTest=false, verify=["sec=$(awk '/^## /{p=(tolower($0) ~ /anal.*tica/)} p' docs/legal/privacidad-v1.0.md); test -n \"$sec\" && ! echo \"$sec\" | grep -Eiq 'an(o|ó)nim(a|o)s?' && echo \"$sec\" | grep -Eiq 'seud(o|ó)nim'"] }
- edit S1.T7 { verify=["cd app && flutter test test/legal/","node scripts/ci/ep01-legal-provider.mjs","f=docs/legal/privacidad-v1.0.md; for p in 'datos con cuenta de dispositivo' 'datos con cuenta completa' 'anal(i|í)tica' 'proveedores' 'retenci(o|ó)n y eliminaci(o|ó)n' 'accesos administrativos'; do grep -Eiq \"^#+ .*$p\" $f || { echo \"falta apartado: $p\"; exit 1; }; done; for p in '7 d(i|í)as' '90 d(i|í)as' '12 meses'; do grep -Eiq \"$p\" $f || { echo \"falta plazo: $p\"; exit 1; }; done"] }
- edit S2.T1 { desc="Crear docs/legal/aprobaciones-privacidad-v1.0.md con el formato que define esta historia (Adenda 2): encabezado con documento, versión 1.0, hash SHA-256 del texto y fecha de vigencia (o marcador provisional); una sección por revisor (Asesoría legal, Producto, Operación/release) con nombre o rol, fecha, veredicto (aprobado / aprobado con observaciones / rechazado), observaciones y resolución; en Asesoría legal, una línea explícita sobre el tratamiento en UE/EEE; en Operación/release, la región de despliegue confirmada; y al final la comparación de hash fuente vs app/assets vs server/legal vs staging con su resultado. TAO-222 reutilizará este formato como aprobaciones-terminos-v1.0.md; no hay dependencia de ejecución con TAO-222. Las entradas quedan pendientes hasta que cada revisor responda.", rollback="git rm -f docs/legal/aprobaciones-privacidad-v1.0.md", validates=["REQ-05"], isTest=false, verify=["f=docs/legal/aprobaciones-privacidad-v1.0.md; for p in 'SHA-256' 'Asesor(i|í)a legal' 'Producto' 'Operaci(o|ó)n/release' 'UE/EEE' 'staging'; do grep -Eiq \"$p\" $f || { echo \"falta: $p\"; exit 1; }; done"] }
- edit S2.T3 { desc="Contrastar el texto de docs/legal/privacidad-v1.0.md con el redactor de logs (docs/product/tecnologia/23_observabilidad_logs_debug_y_costos.md, sección 3) y con DEC-197: el registro de errores sin datos personales y los logs operativos de 7 días no deben contradecir lo que el redactor omite o enmascara. Dejar un caso de revisión con el resultado de la comparación.", rollback="Descartar el caso de revisión; sin cambios en el texto de la política salvo correcciones puntuales revertibles con git checkout.", validates=["REQ-10"], isTest=false, verify=[] }

### Enmienda 10
**REQs:**

- REQ-03 (edit) `inferred`: El resumen breve de la política de privacidad para V-51 vive en la sección de resumen del mismo texto fuente docs/legal/privacidad-v1.0.md, 
- REQ-04 (edit) `confirmed`: Las copias empaquetadas del texto en app/assets/legal/privacidad-v1.0.md y server/legal/privacidad-v1.0.md coinciden en hash con la fuente d
- REQ-10 (edit) `confirmed`: El texto de la política se contrasta con el redactor de logs (docs/product/tecnologia/23_observabilidad_logs_debug_y_costos.md, sección 3) y
- REQ-19 (add) `confirmed`: La narrativa del spec queda alineada con las decisiones del dev: la sección 'Cambios al modelo de datos' queda vacía con el texto 'Sin cambi

**Task ops:**

- edit S1.T1 { desc="Tarea de SOLO LECTURA, primera de la sesión 1, sin ninguna subtarea de escritura (el contenido de proveedores, retención y eliminación y accesos administrativos lo cubre S1.T2). Verificar que app/test/legal/empaquetado_test.dart y scripts/ci/ep01-legal-provider.mjs comparan contra docs/legal/; confirmar en textos_legales_empaquetados.dart si el hash se calcula sobre el archivo completo o sin el encabezado; leer puerto_analitica.dart y registrar en las notas y en el caso de prueba la referencia (símbolo o función, sin número de línea fijo) que confirma opt_in sin red o sin política válida. No escribe ni reemplaza archivos; no ejecuta legal:registrar.", verify=["test -z \"$(git status --porcelain docs/legal app/assets/legal server/legal)\""] }
- edit S1.T3 { desc="Redactar el resumen breve para V-51 en la sección de resumen de docs/legal/privacidad-v1.0.md, siguiendo la estructura de la sección de resumen de docs/legal/terminos-v1.0.md. Se ejecuta después de S1.T2 y se deriva del texto redactado en S1.T2. Debe mencionar 'cuenta de dispositivo', 'cuenta completa', 'seudónima' y 'eliminación', y no contener 'an[oó]nim[ao]s?'. No exige que contenga literalmente '7 días', '90 días' ni '12 meses'.", verify=["bash -c 's=$(awk \"/^## Resumen/{f=1;next} /^## /{f=0} f\" docs/legal/privacidad-v1.0.md); test -n \"$s\" && for p in \"cuenta de dispositivo\" \"cuenta completa\" \"seud[oó]nima\" \"eliminaci[oó]n\"; do echo \"$s\" | grep -qiE \"$p\" || exit 1; done; ! echo \"$s\" | grep -qiE \"an[oó]nim[ao]s?\"'"] }
- edit S2.T3 { desc="Dejar el caso de revisión del contraste con docs/product/tecnologia/23_observabilidad_logs_debug_y_costos.md sección 3 y DEC-197 como sección '## Contraste con el redactor de logs' dentro de docs/legal/aprobaciones-privacidad-v1.0.md, con cada dato que la política declara excluido de logs y su resultado (coincide / contradicción).", verify=["grep -q '^## Contraste con el redactor de logs' docs/legal/aprobaciones-privacidad-v1.0.md"] }

### Enmienda 11
**REQs:**

- REQ-18 (edit) `confirmed`: La comprobación en staging de si privacidad 1.0 ya está registrada en documento_legal y con qué hash NO es una tarea de código: la cubre el 
- REQ-09 (edit) `confirmed`: S1.T1 es de SOLO LECTURA y es la primera tarea de la sesión 1: verifica que app/test/legal/empaquetado_test.dart y scripts/ci/ep01-legal-pro
- REQ-03 (edit) `confirmed`: El resumen breve de la política de privacidad para V-51 es una sección del mismo texto fuente docs/legal/privacidad-v1.0.md con el encabezad

**Task ops:**

- edit S1.T1 {  }
- edit S1.T3 { desc="Redactar el resumen breve para V-51 como sección de docs/legal/privacidad-v1.0.md con el encabezado exacto '## Resumen' (terminos-v1.0.md no trae una sección de resumen que copiar: el título lo fija esta tarea). Se deriva del texto redactado en S1.T2 y debe mencionar 'cuenta de dispositivo', 'cuenta completa', 'seudónima' y 'eliminación', sin el patrón 'an[oó]nim[ao]s?'. Se ejecuta después de S1.T2.", validates=["REQ-03"], verify=["awk '/^## Resumen/{f=1;next} /^## /{f=0} f' docs/legal/privacidad-v1.0.md | grep -ciE 'cuenta de dispositivo|cuenta completa|seud[oó]nima|eliminaci[oó]n'","awk '/^## Resumen/{f=1;next} /^## /{f=0} f' docs/legal/privacidad-v1.0.md | grep -ciE 'an[oó]nim[ao]s?' | grep -qx 0"] }
- edit S2.T2 { desc="Comprobar que las copias app/assets/legal/privacidad-v1.0.md y server/legal/privacidad-v1.0.md coinciden con la fuente docs/legal/privacidad-v1.0.md bajo la regla de hash vigente (confirmada en S1.T1), corriendo cd app && flutter test test/legal/ y node scripts/ci/ep01-legal-provider.mjs. El resultado de esa comparación se anota en la sección final de docs/legal/aprobaciones-privacidad-v1.0.md. Sin cmp byte a byte, sin scripts nuevos y sin ejecutar legal:registrar.", verify=["cd app && flutter test test/legal/","node scripts/ci/ep01-legal-provider.mjs"] }

**REQ ops:**

- remove REQ-19

### Enmienda 12
**REQs:**

- REQ-03 (edit) `confirmed`: El resumen breve de la política de privacidad para V-51 es una sección del mismo texto fuente docs/legal/privacidad-v1.0.md con el encabezad
- REQ-04 (edit) `confirmed`: Las copias empaquetadas del texto en app/assets/legal/privacidad-v1.0.md y server/legal/privacidad-v1.0.md coinciden en hash con la fuente d
- REQ-09 (edit) `confirmed`: S1.T1 es de SOLO LECTURA y es la primera tarea de la sesión 1: verifica que app/test/legal/empaquetado_test.dart y scripts/ci/ep01-legal-pro
- REQ-10 (edit) `confirmed`: El texto de la política se contrasta con el redactor de logs (docs/product/tecnologia/23_observabilidad_logs_debug_y_costos.md, sección 3) y

**Task ops:**

- edit S1.T1 {  }
- edit S1.T2 { verify=["test -f docs/legal/privacidad-v1.0.md","test \"$(grep -c '^# ' docs/legal/privacidad-v1.0.md)\" -eq 1","awk '/^## /{exit} /^### /{bad=1} END{exit bad}' docs/legal/privacidad-v1.0.md"] }
- edit S1.T3 { verify=["for t in 'cuenta de dispositivo' 'cuenta completa' 'seud[oó]nima' 'eliminaci[oó]n'; do awk '/^## Resumen/{f=1;next} /^## /{f=0} f' docs/legal/privacidad-v1.0.md | grep -qiE \"$t\" || exit 1; done","! awk '/^## Resumen/{f=1;next} /^## /{f=0} f' docs/legal/privacidad-v1.0.md | grep -qiE 'an[oó]nim[ao]s?'"] }
- edit S1.T7 { desc="Conservar la descripción actual de S1.T7 y agregar esta nota: el contenido mínimo de REQ-14 a REQ-17 (cifrado en reposo, impersonación para soporte, portal de eliminación, correo transaccional) se revisa de forma manual en el gate, además de los greps de títulos y plazos. El gate de la sesión 1 no cambia." }

### Enmienda 13

**Task ops:**

- edit S1.T7 { desc="Verificar el texto final de docs/legal/privacidad-v1.0.md: un apartado con titulo por cada tema del alcance (datos con cuenta de dispositivo, datos con cuenta completa, analitica, proveedores, retencion y eliminacion, accesos administrativos; REQ-14 a REQ-17), los plazos literales 7 dias, 90 dias y 12 meses, y la coincidencia de hash de la fuente con app/assets/legal y server/legal mediante cd app && flutter test test/legal/ y node scripts/ci/ep01-legal-provider.mjs. El contenido minimo de REQ-14 a REQ-17 (cifrado en reposo, impersonacion para soporte, portal de eliminacion, correo transaccional) se revisa de forma manual en el gate." }
- edit S1.T3 { verify=["grep -c -E '^## Resumen' docs/legal/privacidad-v1.0.md","awk '/^## Resumen/{f=1;next} /^## /{f=0} f' docs/legal/privacidad-v1.0.md | grep -c -i -E 'cuenta de dispositivo|cuenta completa|seud(o|ó)nima|eliminaci(o|ó)n'","awk '/^## Resumen/{f=1;next} /^## /{f=0} f' docs/legal/privacidad-v1.0.md | grep -c -i -E 'an(o|ó)nim(a|o)s?' || true"] }

### Enmienda 14
**REQs:**

- REQ-09 (edit) `confirmed`: S1.T1 es de SOLO LECTURA y es la primera tarea de la sesión 1: verifica que app/test/legal/empaquetado_test.dart y scripts/ci/ep01-legal-pro
- REQ-11 (edit) `confirmed`: La sesión 3 es de código y queda declarada bloqueada por pendientes externos: fecha de vigencia real, aprobación legal, identidad legal del 
- REQ-18 (edit) `confirmed`: La comprobación en staging de si privacidad 1.0 ya está registrada en documento_legal y con qué hash NO es una tarea de código: la cubre el 

**Tasks agregadas:**

- S1: Tarea de SOLO LECTURA, primera de la sesion 1 y previa a cualquier redaccion. Antes de leer, guarda una huella del estado de las rutas legales: { git status --porcelain -- docs/legal app/assets/legal server/legal; git diff HEAD -- docs/legal app/assets/legal server/legal; } | shasum -a 256 > "${TMPDIR:-/tmp}/tao223-s1t1-legal.before" (no depende de que el arbol este limpio al iniciar). Luego: (a) confirmar que existen app/test/legal/empaquetado_test.dart y scripts/ci/ep01-legal-provider.mjs y que comparan contra docs/legal/ (si no, reportarlo antes de redactar, sin modificarlos); (b) leer app/lib/features/legal/data/textos_legales_empaquetados.dart y confirmar si el hash se calcula sobre el archivo completo o sin el encabezado, y dejar esa regla anotada en las notas de la tarea, porque S1.T6, S2.T2, S3.T1 y el caso de regresion de REQ-08 dependen de ella; (c) leer app/lib/features/legal/data/puerto_analitica.dart y registrar en las notas y en el caso de prueba de REQ-02 la referencia (simbolo o funcion, sin numero de linea fijo) que confirma opt_in sin red o sin politica valida. No escribe, crea ni reemplaza archivos del repo; no ejecuta legal:registrar. (valida: REQ-09, REQ-02; rollback: Sin cambios en el repo; descartar las notas y el archivo de huella temporal.)
- S3: Bloqueada hasta que se fije la fecha de vigencia real (pendiente externo). Solo codigo: reemplazar PENDIENTE-VIGENCIA por la fecha real en el encabezado de docs/legal/privacidad-v1.0.md, recalcular el hash con la regla confirmada en S1.T1, copiar la fuente a app/assets/legal/privacidad-v1.0.md y server/legal/privacidad-v1.0.md, actualizar el hash que consumen textos_legales_empaquetados.dart y la suite del servidor, y anotar el nuevo hash en el encabezado de docs/legal/aprobaciones-privacidad-v1.0.md, todo en un solo commit. No consulta ni escribe staging y no ejecuta legal:registrar: la comparacion con staging, las aprobaciones de los revisores y QA-03a-15-02/03 son items de verificacion humana de la sesion 5. (valida: REQ-08, REQ-04; rollback: Revertir el commit de la tarea; vuelven el marcador PENDIENTE-VIGENCIA y el hash previo en la fuente, las copias y el registro.)

**Task ops:**

- edit S1.T3 { verify=["f=docs/legal/privacidad-v1.0.md; sec=$(awk '/^## Resumen/{s=1;next} /^## /{s=0} s' $f); test -n \"$sec\" || { echo 'falta seccion ## Resumen'; exit 1; }; for p in 'cuenta de dispositivo' 'cuenta completa' 'seud(o|ó)nima' 'eliminaci(o|ó)n'; do echo \"$sec\" | grep -qiE \"$p\" || { echo \"falta en resumen: $p\"; exit 1; }; done; ! echo \"$sec\" | grep -qiE 'an(o|ó)nim(a|o)s?'"] }
- edit S1.T2 { verify=["test -f docs/legal/privacidad-v1.0.md","test \"$(grep -c '^# ' docs/legal/privacidad-v1.0.md)\" = 1","awk '/^#+ /{l=index($0,\" \")-1; if((p==0 && l!=1) || (p>0 && l>p+1)){print \"salto de nivel: \" $0; bad=1} p=l} END{exit bad}' docs/legal/privacidad-v1.0.md"] }

### Enmienda 15

**Task ops:**

- move S1.T8 → S1

### Enmienda 16

**Task ops:**

- move S1.T2 → S9
- move S1.T3 → S9
- move S1.T4 → S9
- move S1.T5 → S9
- move S1.T6 → S9
- move S1.T7 → S9

### Enmienda 17

**Task ops:**

- move S9.T1 → S1
- move S9.T2 → S1
- move S9.T3 → S1
- move S9.T4 → S1
- move S9.T5 → S1
- move S9.T6 → S1

### Enmienda 18
**REQs:**

- REQ-01 (edit) `confirmed`: Existe en docs/legal/privacidad-v1.0.md el texto fuente de la política de privacidad en español (DEC-049), en Markdown, con versión y vigenc
- REQ-08 (edit) `confirmed`: El marcador provisional de vigencia va en el campo vigente_desde del encabezado YAML de docs/legal/privacidad-v1.0.md (vigente_desde: PENDIE
- REQ-11 (edit) `confirmed`: La sesión 3 es de código y queda declarada bloqueada hasta que existan la fecha de vigencia real y la confirmación escrita de Operación/rele

**Task ops:**

- edit S1.T1 { desc="(b) Confirmar en app/lib/features/legal/data/textos_legales_empaquetados.dart y app/test/legal/empaquetado_test.dart que el hash es SHA-256 del archivo completo calculado en ejecución y que no se guarda en ningún archivo (lectura previa ya lo indica; si el código dijera otra cosa, reportarlo antes de redactar). Tarea de SOLO LECTURA: no escribe ni reemplaza archivos; también verifica que app/test/legal/empaquetado_test.dart y scripts/ci/ep01-legal-provider.mjs comparan contra docs/legal/ y registra en sus notas la referencia (símbolo o función, sin número de línea) de puerto_analitica.dart que confirma opt_in sin red o sin política válida.", verify=["test -f app/test/legal/empaquetado_test.dart && test -f scripts/ci/ep01-legal-provider.mjs && test -f app/lib/features/legal/data/textos_legales_empaquetados.dart && test -f app/lib/features/legal/data/puerto_analitica.dart","grep -q 'docs/legal' app/test/legal/empaquetado_test.dart","grep -q 'docs/legal' scripts/ci/ep01-legal-provider.mjs"] }
- edit S1.T2 { desc="Redactar el texto fuente de la política de privacidad v1 en docs/legal/privacidad-v1.0.md (reemplaza el archivo existente), cubriendo REQ-14, REQ-15, REQ-16, REQ-17, REQ-02 y REQ-12 sin contradecir las DEC citadas. En el apartado de analítica no escribir la palabra 'anónima' ni siquiera negada ('no anónima'): el verify de S1.T5 la rechaza; expresar DEC-058 como 'seudónima: no identifica directamente a la persona, pero no es anónima en sentido legal' NO sirve, usar en cambio 'seudónima: se asocia a un identificador técnico y no a tu nombre o correo'. Mantener el encabezado YAML existente (patrón de terminos-v1.0.md)." }
- edit S1.T3 { verify=["f=docs/legal/privacidad-v1.0.md; sec=$(awk '/^## Resumen/{s=1;next} /^## /{s=0} s' $f); test -n \"$sec\" || { echo 'falta seccion ## Resumen'; exit 1; }; for p in 'cuenta de dispositivo' 'cuenta completa' 'seud(o|ó|Ó)nima' 'eliminaci(o|ó|Ó)n'; do echo \"$sec\" | grep -qiE \"$p\" || { echo \"falta en resumen: $p\"; exit 1; }; done; ! echo \"$sec\" | grep -qiE 'an(o|ó|Ó)nim(a|o)s?'"] }
- edit S1.T4 { desc="Dejar en el encabezado YAML de docs/legal/privacidad-v1.0.md el campo vigente_desde con el marcador provisional PENDIENTE-VIGENCIA, sin fecha inventada. Efecto buscado: legal:registrar (server/src/legal/registro-version.ts) rechaza el archivo hasta que se fije la fecha real, por lo que no se puede publicar por error. La propagacion a las copias la hace S1.T6.", verify=["grep -qE '^vigente_desde: PENDIENTE-VIGENCIA$' docs/legal/privacidad-v1.0.md"] }
- edit S1.T5 { verify=["sec=$(awk '/^## /{p=(tolower($0) ~ /anal.*tica/)} p' docs/legal/privacidad-v1.0.md); test -n \"$sec\" && ! echo \"$sec\" | grep -Eiq 'an(o|ó|Ó)nim(a|o)s?' && echo \"$sec\" | grep -Eiq 'seud(o|ó|Ó)nim'"] }
- edit S1.T6 { desc="Copiar docs/legal/privacidad-v1.0.md sin cambios a app/assets/legal/privacidad-v1.0.md y server/legal/privacidad-v1.0.md, en el mismo commit y la misma sesion. No hay hash que editar a mano: lo calculan textos_legales_empaquetados.dart y las suites de empaquetado. Sin scripts ni formatos nuevos." }
- edit S2.T1 { desc="Crear docs/legal/aprobaciones-privacidad-v1.0.md con el formato definido en la Adenda 2. El hash SHA-256 del encabezado del registro se obtiene con shasum -a 256 docs/legal/privacidad-v1.0.md (archivo completo)." }
- edit S3.T1 { desc="Se ejecuta cuando existan la fecha de vigencia real y la confirmacion escrita de la identidad legal del responsable del tratamiento y de la region de despliegue de Railway (Operacion/release y asesoria legal). Solo codigo: incorporar el responsable y la region en el apartado de proveedores y ubicacion de docs/legal/privacidad-v1.0.md (sin inventar transferencias), reemplazar vigente_desde: PENDIENTE-VIGENCIA por la fecha real, copiar la fuente a app/assets/legal/privacidad-v1.0.md y server/legal/privacidad-v1.0.md y anotar el nuevo SHA-256 (shasum -a 256 del archivo completo) en el encabezado de docs/legal/aprobaciones-privacidad-v1.0.md, todo en un solo commit. No consulta ni escribe staging y no ejecuta legal:registrar: la comparacion con staging, las aprobaciones de los revisores y QA-03a-15-02/03 son items de verificacion humana de la sesion 5.", verify=["! grep -q 'PENDIENTE-VIGENCIA' docs/legal/privacidad-v1.0.md","grep -qE '^vigente_desde: [0-9]{4}-[0-9]{2}-[0-9]{2}$' docs/legal/privacidad-v1.0.md","grep -q \"$(shasum -a 256 docs/legal/privacidad-v1.0.md | cut -d' ' -f1)\" docs/legal/aprobaciones-privacidad-v1.0.md"] }

### Enmienda 19

**Task ops:**

- edit S1.T2 { desc="Redactar el texto fuente de la política de privacidad v1 en docs/legal/privacidad-v1.0.md (reemplaza el archivo existente), cubriendo REQ-14, REQ-15, REQ-16, REQ-17, REQ-02 y REQ-12 sin contradecir las DEC citadas. En el apartado de analítica no escribir la palabra 'anónima', ni siquiera negada ('no anónima'), porque el verify de S1.T5 la rechaza; expresar DEC-058 como 'seudónima: se asocia a un identificador técnico y no a tu nombre o correo'. Mantener el encabezado YAML existente (patrón de terminos-v1.0.md)." }
- edit S3.T1 { verify=["! grep -q 'PENDIENTE-VIGENCIA' docs/legal/privacidad-v1.0.md","grep -qE '^vigente_desde: [0-9]{4}-[0-9]{2}-[0-9]{2}$' docs/legal/privacidad-v1.0.md","grep -q \"$(shasum -a 256 docs/legal/privacidad-v1.0.md | cut -d' ' -f1)\" docs/legal/aprobaciones-privacidad-v1.0.md"] }

### Enmienda 20
**REQs:**

- REQ-01 (edit) `confirmed`: Existe en docs/legal/privacidad-v1.0.md el texto fuente de la política de privacidad en español (DEC-049), en Markdown, con versión y vigenc
- REQ-05 (edit) `confirmed`: Queda el registro de aprobaciones docs/legal/aprobaciones/privacidad-v1.0.md (subcarpeta, Adenda 3, para no romper el listado de versiones d
- REQ-08 (edit) `confirmed`: El marcador provisional de vigencia va en el campo vigente_desde del encabezado YAML de docs/legal/privacidad-v1.0.md (vigente_desde: PENDIE
- REQ-10 (edit) `confirmed`: El texto de la política se contrasta con el redactor de logs (docs/product/tecnologia/23_observabilidad_logs_debug_y_costos.md, sección 3) y
- REQ-11 (edit) `confirmed`: La sesión 3 es de código y queda declarada bloqueada hasta que existan la fecha de vigencia real y la confirmación escrita de Operación/rele

**Tasks agregadas:**

- S1: Barrido de rutas de la Adenda 3: comprobar que el registro de aprobaciones de privacidad vive en docs/legal/aprobaciones/privacidad-v1.0.md y que ningún archivo bajo docs/legal, app/assets/legal ni server/legal referencia las rutas obsoletas docs/legal/aprobaciones-privacidad-v1.0.md ni docs/legal/aprobaciones-terminos-v1.0.md. Si alguna task o archivo de esta sesión usó la ruta con guion, corregirla a la subcarpeta. No crea el registro de términos (lo crea TAO-222 en docs/legal/aprobaciones/terminos-v1.0.md). Sin scripts ni formatos nuevos (REQ-07). (valida: REQ-01, REQ-05, REQ-10, test; rollback: Revertir el commit de la corrección de rutas con git revert; no se borran versiones, hashes ni evidencia.)

### Enmienda 21
**REQs:**

- REQ-01 (edit) `confirmed`: Existe en docs/legal/privacidad-v1.0.md el texto fuente de la política de privacidad en español (DEC-049), en Markdown, con versión y vigenc
- REQ-05 (edit) `confirmed`: Queda el registro de aprobaciones docs/legal/aprobaciones/privacidad-v1.0.md (subcarpeta, Adenda 3, para no romper el listado de versiones d
- REQ-08 (edit) `confirmed`: El marcador provisional de vigencia va en el campo vigente_desde del encabezado YAML de docs/legal/privacidad-v1.0.md (vigente_desde: PENDIE
- REQ-10 (edit) `confirmed`: El texto de la política se contrasta con el redactor de logs (docs/product/tecnologia/23_observabilidad_logs_debug_y_costos.md, sección 3) y
- REQ-11 (edit) `confirmed`: La sesión 3 es de código y queda declarada bloqueada hasta que existan la fecha de vigencia real y la confirmación escrita de Operación/rele

**Tasks agregadas:**

- S2: Comprobar que el registro de aprobaciones existe en docs/legal/aprobaciones/privacidad-v1.0.md (ruta de la Adenda 3, subcarpeta) con la estructura de REQ-05, y que ninguna tarea ni reviewOutcome de S2 usa la ruta obsoleta docs/legal/aprobaciones-privacidad-v1.0.md. Comparar su formato con el de docs/legal/aprobaciones/terminos-v1.0.md (ya creado por TAO-222, solo lectura) para que no diverjan; no modificar el archivo de términos. (valida: REQ-05, REQ-10; rollback: No requiere reversión: es una comprobación de solo lectura; si se ajusta el registro, git checkout -- docs/legal/aprobaciones/privacidad-v1.0.md.)

**Task ops:**

- edit S1.T8 { desc="Barrido de referencias obsoletas limitado a los archivos del plan: confirmar que ninguno cita las rutas docs/legal/aprobaciones-privacidad-v1.0.md ni docs/legal/aprobaciones-terminos-v1.0.md (Adenda 3) y reemplazar toda aparición por docs/legal/aprobaciones/privacidad-v1.0.md. Esta tarea NO comprueba que el registro exista: esa comprobación pertenece a la sesión 2, donde se crea.", verify=[] }
- edit S3.T1 { desc="Incorporar al texto docs/legal/privacidad-v1.0.md la identidad legal del responsable del tratamiento y la región de despliegue de Railway confirmadas por escrito, fijar la fecha real en vigente_desde (reemplaza PENDIENTE-VIGENCIA), copiar la fuente a app/assets/legal/privacidad-v1.0.md y server/legal/privacidad-v1.0.md, recalcular el hash SHA-256 del archivo completo con la regla confirmada en S1.T1 y anotarlo en docs/legal/aprobaciones/privacidad-v1.0.md (ruta de la Adenda 3), todo en el mismo commit y la misma sesión. No ejecutar legal:registrar ni crear scripts nuevos.", verify=["cmp docs/legal/privacidad-v1.0.md app/assets/legal/privacidad-v1.0.md","cmp docs/legal/privacidad-v1.0.md server/legal/privacidad-v1.0.md","node scripts/ci/ep01-legal-provider.mjs"] }

### Enmienda 22
**REQs:**

- REQ-05 (edit) `confirmed`: Queda el registro de aprobaciones docs/legal/aprobaciones/privacidad-v1.0.md (subcarpeta, Adenda 3, para no romper el listado de versiones d
- REQ-19 (add) `confirmed`: La tarea S3.T1 conserva dos salvaguardas: (a) al incorporar responsable y región de despliegue al texto no se inventan transferencias intern
- REQ-20 (add) `confirmed`: Al reemplazar menciones de rutas obsoletas, cada ruta se reemplaza por separado y por su par correcto: docs/legal/aprobaciones-privacidad-v1

**Task ops:**

- edit S2.T1 { desc="Crear el registro de aprobaciones de privacidad en docs/legal/aprobaciones/privacidad-v1.0.md (crear el directorio docs/legal/aprobaciones/ si no existe; NO usar la ruta obsoleta docs/legal/aprobaciones-privacidad-v1.0.md) con la estructura mínima de la Adenda 2 definida en REQ-05: encabezado con documento, versión 1.0, hash SHA-256 y vigencia (o marcador provisional); secciones por revisor (Asesoría legal con línea UE/EEE, Producto, Operación/release con región de despliegue); y comparación final de hash fuente vs app/assets vs server/legal vs staging.", validates=["REQ-05"], verify=["test -f docs/legal/aprobaciones/privacidad-v1.0.md","test ! -e docs/legal/aprobaciones-privacidad-v1.0.md"] }
- edit S1.T8 { desc="Reemplazar las menciones de rutas obsoletas por ruta, de forma separada: docs/legal/aprobaciones-privacidad-v1.0.md pasa a docs/legal/aprobaciones/privacidad-v1.0.md, y docs/legal/aprobaciones-terminos-v1.0.md pasa a docs/legal/aprobaciones/terminos-v1.0.md. Nunca apuntar una mención de términos al registro de privacidad ni al revés. No modificar el contenido de docs/legal/aprobaciones/terminos-v1.0.md.", validates=["REQ-05","REQ-20"] }
- edit S2.T4 { desc="Leer docs/legal/aprobaciones/terminos-v1.0.md (solo lectura) y compararlo con docs/legal/aprobaciones/privacidad-v1.0.md. La estructura mínima de la Adenda 2 prevalece sobre el registro de términos de TAO-222: si hay diferencias de estructura se REPORTAN en las notas de la tarea; no se copian al registro de privacidad ni se alinea hacia abajo el de privacidad. No modificar el archivo de términos.", validates=["REQ-05"] }
- edit S3.T1 { desc="Incorporar al texto docs/legal/privacidad-v1.0.md la identidad legal del responsable del tratamiento y la región de despliegue de Railway (solo con la confirmación escrita de Operación/release y asesoría legal), fijar la vigencia real en vigente_desde, recalcular el hash del archivo completo con la regla confirmada en S1.T1, copiar la fuente a app/assets/legal/privacidad-v1.0.md y server/legal/privacidad-v1.0.md y anotar el hash en docs/legal/aprobaciones/privacidad-v1.0.md, todo en el mismo commit. Salvaguardas: NO inventar transferencias internacionales (declarar solo lo confirmado por escrito) y NO consultar ni escribir en staging ni ejecutar legal:registrar.", validates=["REQ-08","REQ-11","REQ-19"] }

### Enmienda 23
**REQs:**

- REQ-21 (add) `confirmed`: Rollback de S2.T1: 'git rm -f docs/legal/aprobaciones/privacidad-v1.0.md'. No se borra el directorio docs/legal/aprobaciones/ porque ya exis
- REQ-22 (add) `confirmed`: El barrido de S1.T8 se acota a los archivos de este plan: docs/legal/privacidad-v1.0.md, sus copias en app/assets/legal/ y server/legal/, y 
- REQ-23 (add) `confirmed`: El hash SHA-256 que S2.T1 anota en docs/legal/aprobaciones/privacidad-v1.0.md se calcula con la regla de hash confirmada en S1.T1 (SHA-256 d

**Task ops:**

- edit S2.T1 { rollback="git rm -f docs/legal/aprobaciones/privacidad-v1.0.md (no borrar el directorio docs/legal/aprobaciones/: ya existe por terminos-v1.0.md).", validates=["REQ-05","REQ-21","REQ-23"] }
- edit S1.T8 { validates=["REQ-20","REQ-22"] }
- edit S3.T1 { validates=["REQ-04"] }
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

**Gate (auto)**: Redaccion de privacidad v1.0: docs/legal/privacidad-v1.0.md reemplazado segun Adenda 1 con todos los apartados del alcance (datos con cuenta de dispositivo, datos con cuenta completa, analitica seudonima por region, proveedores, retencion y eliminacion, accesos administrativos) y los plazos 7 dias, 90 dias y 12 meses; resumen breve para V-51 coherente; copias app/assets/legal y server/legal con el mismo hash; pasan cd app && flutter test test/legal/ y node scripts/ci/ep01-legal-provider.mjs.

### Session 2 · T1 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2
- [x] S2.T3
- [x] S2.T4

**Gate (auto)**: La fuente y las copias de app/assets/legal/ y server/legal/ de privacidad-v1.0.md tienen el mismo hash según la regla confirmada en la primera tarea, los tests de hash de app y servidor pasan y el registro docs/legal/aprobaciones/privacidad-v1.0.md está creado (estado pendiente, versión, hash, fecha y observaciones), pendiente de las firmas externas. legal:registrar no se ejecuta.

### Session 4 · T0 · continue

### Session 5 · T0 · open

**Gate (strong)**: Verificacion humana de privacidad v1.0, despues de la sesion de codigo que fija la vigencia real (S3). Cumplida cuando: el hash final de docs/legal/privacidad-v1.0.md coincide con la fila de documento_legal de staging (o queda anotado como pendiente humano si no hay acceso de solo lectura, REQ-18) y esta registrado en docs/legal/aprobaciones/privacidad-v1.0.md; los tres revisores registraron su veredicto; QA-03a-15-02 y QA-03a-15-03 pasan. No se escribe en staging ni se ejecuta legal:registrar.
