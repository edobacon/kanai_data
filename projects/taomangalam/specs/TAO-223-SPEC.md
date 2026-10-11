---
id: TAO-223-SPEC
project: taomangalam
ticket: TAO-223
status: draft
---

# TAO-223 · Política de privacidad v1 en español: texto fuente en docs/legal, resumen para V-51, copias empaquetadas con hash coincidente y registro de aprobaciones

## Resumen ejecutivo

Qué se hace: se redacta la política de privacidad v1 en español como Markdown versionado en docs/legal/. Lleva versión, vigencia y hash, y cubre datos por tipo de cuenta, analítica por región (seudónima, opt_in/opt_out/disabled), proveedores, retención, eliminación y accesos administrativos auditados. Se agrega el resumen breve para V-51, se sincronizan las copias empaquetadas de app y servidor con el mismo patrón y chequeo de hash que TAO-222 (términos) y se deja el registro de aprobaciones de asesoría legal, Producto y Operación/release.
Qué NO se hace: términos de uso (HU-03a-14), declaraciones de App Store y Google Play (HU-17-10), texto de politica_analitica_region (HU-15-03), cambios de UI de V-51 (HU-01-13) ni mecanismos nuevos de empaquetado o hash: se reusa el existente.
Cómo se sabe que funciona: la fuente y las copias tienen el mismo hash y los jobs app/server del CI (filtro docs/legal/ en ci-pr.yml) pasan. El texto no contiene "anónima" aplicado a métricas. Cada dato que el servidor recibe de una cuenta de dispositivo en M1a aparece descrito (QA-03a-15-01). El registro de aprobaciones tiene fecha, versión y observaciones resueltas.
Tamaño: 2 sesiones (T2 + T1), unos 5 puntos. ADVERTENCIAS: (1) la aprobación legal, la confirmación de Producto y Operación y el contraste con un evento real de staging (QA-03a-15-02) son humanos o externos y bloquean la publicación, no la redacción. (2) La identidad legal del responsable y la región de Railway están pendientes externos: el texto no puede declarar la ubicación ni las transferencias definitivas sin ellas. (3) La lectura en tablet horizontal en V-51 (QA-03a-15-03) depende de HU-01-13 y se valida en QA manual. (4) Ya existe app/assets/legal/privacidad-v1.0.md: hay que confirmar si es un placeholder ("estado faltante") y reemplazarlo, sin crear una ruta paralela.

Datos a confirmar antes de ejecutar:
- Nombre exacto del archivo fuente en docs/legal/ y formato del encabezado (versión, vigencia, hash): copiar el patrón que dejó TAO-222 para términos en docs/legal/.
- Ruta y nombre de la copia del servidor en server/legal/ y el test o script que compara su hash: confirmar en server/ (ci-pr.yml:113-117 solo dice que la suite del servidor lo chequea).
- Archivo de test de la app que verifica el hash de app/assets/legal/ (consumido por textos_legales_empaquetados.dart:11): confirmar su ruta en app/test/ para el verify.
- Si el hash se calcula sobre el archivo completo o sin el encabezado: confirmar en textos_legales_empaquetados.dart.
- Dónde vive el registro de aprobaciones de términos de TAO-222 (archivo en docs/legal/ o adjunto del issue GH-94), para replicar el formato.
- Cómo se registra la fila documento_legal (tipo=privacidad) en staging: seed del servidor o publicación manual según DEC-222.
- Identidad legal del responsable del tratamiento y región de despliegue de Railway (pendiente externo; tecnologia/21 solo dice "una región inicial").

## Requirements

### REQ-01 `confirmed`
> Fuente: Adenda 1 y decision vigente del dev TAO-223-Q5/Q6; Alcance (Incluye)

Existe en docs/legal/privacidad-v1.0.md el texto fuente de la política de privacidad en español (DEC-049), en Markdown, con versión, vigencia y hash. El archivo se REEMPLAZA (privacidad-v1.0.md, como fija la Adenda 1); no se crea v1.1. La rama 1.1 (privacidad-v1.1.md) queda solo como contingencia y únicamente con aprobación del dev si S1.T1 detecta que privacidad 1.0 ya está registrada o no puede verificarlo. Describe sin contradecir las DEC citadas: (a) cuenta de dispositivo: las consultas quedan solo en el teléfono y al servidor llegan identidad técnica del dispositivo, aceptaciones, consentimiento, usos de producto y métricas si corresponde (DEC-212); (b) cuenta completa: correo, respaldo y sincronización del recorrido, incluidos nombre y fecha de nacimiento de consultantes, con cifrado en reposo (DEC-164), soporte (DEC-216) y medios en la nube del propio usuario con el permiso guardado solo en el teléfono (DEC-044, DEC-227); (c) proveedores: alojamiento y base (DEC-164, DEC-195), registro de errores sin datos personales (DEC-197) y correo transaccional (DEC-165); (d) retención y eliminación: máximo 7 días, comprobante técnico de 90 días, trazabilidad anonimizada de unidades (la palabra "anonimizada" es obligatoria aquí y no debe quitarse), excepción legal (DEC-127, DEC-128), purga de cuentas de dispositivo inactivas por 12 meses (DEC-224), logs operativos de 7 días (DEC-197) y portal de eliminación (DEC-129); (e) accesos administrativos auditados, incluida la impersonación para soporte (DEC-057, DEC-058). La identidad legal del responsable del tratamiento y la región de Railway quedan declaradas en el texto como pendientes externos que NO bloquean la redacción (sí bloquean la sesión 3). Reemplaza el texto versionado de un archivo; no implica borrar datos existentes ni editar una versión ya publicada.

### REQ-02 `confirmed`
> Fuente: Alcance (Analítica), DEC-058, DEC-130, DEC-171; puerto_analitica.dart

El apartado de analítica dice que es propia y sin terceros (DEC-171), seudónima y nunca anónima (DEC-058), opt_in en UE/EEE y en región desconocida, opt_out o disabled según la región, y que se puede cambiar desde Cuenta (DEC-130). Es coherente con el comportamiento real del puerto de analítica, que aplica opt_in sin red o sin política válida. La referencia (símbolo o función de puerto_analitica.dart, sin número de línea fijo) se registra al leerlo en S1.T1 y se cita de forma idéntica en el REQ y en su caso de prueba. La verificación se hace dentro del apartado de analítica de docs/legal/privacidad-v1.0.md (tarea S1.T5): apartado no vacío, 0 coincidencias de anónima/anónimo y al menos una de seudónima; no con grep de "anonim" sobre todo el archivo (la palabra "anonimizada" es obligatoria en retención).

### REQ-03 `inferred`
> Fuente: Alcance (resumen breve para V-51); terminos-v1.0.md

El resumen breve de la política de privacidad para V-51 vive en la sección de resumen del mismo texto fuente docs/legal/privacidad-v1.0.md, siguiendo la estructura de la sección de resumen de docs/legal/terminos-v1.0.md, y es coherente con el texto completo y con su misma versión 1.0. No existe un archivo aparte para el resumen. Dependencia explícita: la tarea del resumen (S1.T2) se ejecuta después de la redacción del texto fuente (S1.T3), porque el resumen se deriva del texto redactado, y su verificación no corre antes de esa redacción; S1.T1 sigue siendo la primera tarea de la sesión.

### REQ-04 `confirmed`
> Fuente: DEC-219; patrón TAO-222; HU-03a-10

Las copias empaquetadas del texto en app/assets/legal/privacidad-v1.0.md y server/legal/privacidad-v1.0.md coinciden en hash con la fuente docs/legal/privacidad-v1.0.md, de modo que el texto viaja en la app para el primer uso sin red (DEC-219). La propagación de las copias y la actualización del hash que consumen textos_legales_empaquetados.dart y la suite del servidor se hacen en S1.T6, con la regla de hash confirmada en S1.T1, en el mismo commit y la misma sesión, para no dejar los chequeos de hash en rojo entre sesiones. El gate de S1 y su reviewOutcome exigen que pasen cd app && flutter test test/legal/ y node scripts/ci/ep01-legal-provider.mjs.

### REQ-05 `inferred`
> Fuente: Criterios de aceptación 3 y 4; decisión vigente del dev TAO-223-Q5/Q6

Queda el registro de aprobaciones docs/legal/aprobaciones-privacidad-v1.0.md, con el mismo formato que el registro de términos de TAO-222 (estado pendiente, versión, hash, fecha y observaciones) y tres entradas para la versión 1.0: asesoría legal (fecha, versión y observaciones resueltas, incluido el tratamiento en UE/EEE, P-227), aceptación funcional de Producto y confirmación de Operación/release sobre la ubicación de la infraestructura, todo por escrito y asociado a la versión y al hash. La detección de un hash registrado distinto de la fuente es humana: la hace quien revisa comparando el hash del registro con el de la fuente y con la fila de documento_legal de staging; NO hay bloqueo automático de la publicación ni chequeo automático (REQ-07 prohíbe scripts nuevos). Adjuntar el registro a GH-94 lo confirma el dev aparte; no es tarea del ejecutor.

### REQ-06 `inferred`
> Fuente: taomangalam/app/assets/legal/privacidad-v1.0.md:2

El texto tiene una jerarquía de títulos Markdown sin saltos de nivel, para lector de pantalla y lectura en teléfono y tablet, sin tablas anchas que se corten en pantallas angostas.

### REQ-07 `inferred` `enforcement`
> Fuente: taomangalam/.github/workflows/ci-pr.yml:113

Reusar el patrón de TAO-222 (términos v1): misma ubicación de la fuente en docs/legal/, mismo formato de encabezado (versión, vigencia, hash), mismo mecanismo de empaquetado hacia app/assets/legal/ y server/legal/ y mismo chequeo de hash. No crear un script, una ruta ni un formato nuevos.

### REQ-08 `confirmed`
> Fuente: Adenda 1 (vigencia provisional)

El encabezado del texto fuente lleva la fecha de vigencia como marcador provisional explícito (PENDIENTE-VIGENCIA) y no una fecha inventada; la tarea S1.T4 se limita a dejar ese marcador. Al fijarse la fecha real, tras la aprobación legal, se recalcula el hash y se actualiza en el encabezado y en las copias app/assets/legal/privacidad-v1.0.md y server/legal/privacidad-v1.0.md, junto con el hash que consumen textos_legales_empaquetados.dart y la suite del servidor, todo en el mismo commit y la misma sesión (propagación en S1.T6 y, con la vigencia real, en S3.T1).

### REQ-09 `confirmed`
> Fuente: docs/legal/README.md; decisión vigente del dev TAO-223-Q5/Q6

Antes de redactar, S1.T1 (primera tarea de la sesión 1) verifica que app/test/legal/empaquetado_test.dart y scripts/ci/ep01-legal-provider.mjs comparan contra docs/legal/; confirma en textos_legales_empaquetados.dart si el hash se calcula sobre el archivo completo o sin el encabezado; lee puerto_analitica.dart y registra la referencia (símbolo o función, sin número de línea fijo) que confirma opt_in sin red o sin política válida; y consulta en staging, SOLO LECTURA por el túnel (railway connect postgres --tunnel-only), si privacidad 1.0 está registrada en documento_legal o tiene aceptaciones. Si lo está o no puede verificarlo, SE DETIENE y consulta al dev antes de usar 1.1 (ya no es valor por defecto). legal:registrar no se ejecuta en ningún verify. S1.T6 y S3.T1 usan la regla de hash confirmada ahí. Sin crear scripts ni formatos nuevos.

### REQ-10 `confirmed`
> Fuente: Pedido de cambio punto 2; Requisitos transversales (coherencia con tecnologia/23 §3); DEC-197

El texto de la política se contrasta con el redactor de logs (tecnologia/23 §3) y con DEC-197: el registro de errores sin datos personales y los logs operativos de 7 días descritos en la política no contradicen lo que el redactor omite o enmascara. Queda un caso de revisión con el resultado de esa comparación.

### REQ-11 `confirmed`
> Fuente: Planificación (pendientes externos); decisión vigente del dev TAO-223-Q5/Q6

La sesión 3 queda declarada bloqueada por pendientes externos: fecha de vigencia real, aprobación legal, identidad legal del responsable y región de Railway, y acceso a staging (solo lectura por el túnel). Su única tarea es S3.T1 y su reviewOutcome es: el hash final con la vigencia real es idéntico en la fuente docs/legal/privacidad-v1.0.md, en las copias app/assets/legal/ y server/legal/, y en la fila de documento_legal de staging, calculado con la regla de hash confirmada en S1.T1, y esa comparación queda registrada en docs/legal/aprobaciones-privacidad-v1.0.md. La sesión 4 de review no lleva tareas.

### REQ-12 `confirmed`
> Fuente: Pedido de cambio punto 10; Requisitos transversales (Compatibilidad/migración)

El texto o el registro de aprobación deja documentado que un tratamiento nuevo agregado en M2 u otro hito exige una versión nueva de la política con exige_reaceptacion.

### REQ-13 `confirmed`
> Fuente: DEC-222; HU-03a-10

Sin cambios al modelo de datos: la fila de documento_legal (tipo privacidad, versión 1.0) la registra el pipeline legal:registrar según DEC-222 (HU-03a-10); este ticket no crea fila ni seed ni ejecuta legal:registrar.
## Tasks

#### S1.T1 — Primera tarea de la sesión. Verificar sin escribir: (1) app/test/legal/empaquetado_test.dart y scripts/ci/ep01-legal-provider.mjs comparan contra docs/legal/; (2) en textos_legales_empaquetados.dart, si el hash se calcula sobre el archivo completo o sin el encabezado; (3) leer puerto_analitica.dart y registrar la referencia (símbolo o función, sin número de línea fijo) que confirma opt_in sin red o sin política válida; (4) consultar en staging, SOLO LECTURA por el túnel (railway connect postgres --tunnel-only), si privacidad 1.0 está registrada en documento_legal o tiene aceptaciones. Si lo está o no se puede verificar, DETENERSE y consultar al dev antes de usar 1.1 (no es valor por defecto). Reemplazar docs/legal/privacidad-v1.0.md según la Adenda 1. S1.T6 y S3.T1 usan la regla de hash confirmada aquí. No ejecutar legal:registrar.
Contrato: rollback: No hay cambios de archivos que revertir; la tarea solo lee. Descartar las notas de verificación si se rehace.. Status: pending

#### S1.T2 — Redactar la sección de resumen breve para V-51 dentro de docs/legal/privacidad-v1.0.md, con la estructura de la sección de resumen de docs/legal/terminos-v1.0.md. Depende de S1.T3: se deriva del texto ya redactado y su verify no corre antes de esa redacción. Plazos y términos deben coincidir con el texto completo.
Contrato: rollback: Quitar la sección de resumen de docs/legal/privacidad-v1.0.md con git checkout del archivo al estado previo a la tarea.. Status: pending

#### S1.T3 — Redactar el texto completo de docs/legal/privacidad-v1.0.md (reemplaza el archivo, no crea v1.1) en dos partes de la misma tarea. Parte (a): datos por tipo de cuenta, analítica por región (usar seudónima, nunca anónima) y proveedores. Parte (b): retención y eliminación (con "anonimizada" en trazabilidad de unidades), accesos administrativos auditados con impersonación, nota de que un tratamiento nuevo en M2 u otro hito exige versión nueva con exige_reaceptacion (REQ-12), y declaración de la identidad legal del responsable y la región de Railway como pendientes externos que no bloquean la redacción. Jerarquía de títulos sin saltos y sin tablas anchas.
Contrato: rollback: Restaurar docs/legal/privacidad-v1.0.md al estado previo con git checkout; no tocar copias empaquetadas.. Status: pending

#### S1.T4 — Dejar en el encabezado de docs/legal/privacidad-v1.0.md la vigencia como marcador provisional PENDIENTE-VIGENCIA, sin fecha inventada. El hash se recalcula cuando se fije la vigencia real; la propagación a las copias la hace S1.T6.
Contrato: rollback: Revertir el encabezado de docs/legal/privacidad-v1.0.md con git checkout al estado previo.. Status: pending

#### S1.T5 — Verificar que la palabra "anónima" no aparece dentro del apartado de analítica de docs/legal/privacidad-v1.1.md y que sí aparece "seudónima" (DEC-058). La búsqueda se limita a ese apartado; no usar grep de "anonim" sobre todo el archivo porque "anonimizada" es obligatoria en retención. Esta es la única tarea que hace esta verificación.
Contrato: rollback: No aplica: solo verificación.. Status: pending

#### S1.T6 — Con la regla de hash confirmada en S1.T1, copiar docs/legal/privacidad-v1.0.md a app/assets/legal/privacidad-v1.0.md y server/legal/privacidad-v1.0.md y actualizar el hash que consumen textos_legales_empaquetados.dart y la suite del servidor, en el mismo commit y la misma sesión. Sin scripts ni formatos nuevos.
Contrato: rollback: Revertir el commit de la tarea; las copias y los hashes vuelven juntos al estado previo.. Status: pending

#### S2.T1 — Crear docs/legal/aprobaciones-privacidad-v1.0.md con el mismo formato que el registro de términos de TAO-222 (estado pendiente, versión 1.0, hash, fecha y observaciones) y tres entradas: asesoría legal (incluye tratamiento en UE/EEE, P-227), aceptación funcional de Producto y confirmación de Operación/release sobre la ubicación de la infraestructura. Registrar también ahí que un tratamiento nuevo en M2 u otro hito exige versión nueva con exige_reaceptacion (REQ-12). Adjuntarlo a GH-94 lo confirma el dev aparte.
Contrato: rollback: Eliminar docs/legal/aprobaciones-privacidad-v1.0.md con git; no afecta texto ni copias.. Status: pending

#### S2.T2 — Contrastar el hash de docs/legal/privacidad-v1.0.md con las copias app/assets/legal/ y server/legal/ usando la regla de hash confirmada en S1.T1 (no shasum del archivo completo salvo que esa regla sea justamente archivo completo), y registrar el resultado en docs/legal/aprobaciones-privacidad-v1.0.md. La detección de discrepancias es humana; no hay bloqueo automático.
Contrato: rollback: Revertir la entrada de comparación en docs/legal/aprobaciones-privacidad-v1.0.md con git checkout.. Status: pending

#### S2.T3 — Caso de revisión que contrasta el texto de la política en docs/legal/privacidad-v1.0.md (apartados de proveedores, registro de errores y logs operativos de 7 días) con el redactor de logs (tecnologia/23 §3) y con DEC-197. Verifica que lo descrito en la política no contradiga lo que el redactor omite o enmascara. Registra el resultado de la comparación y cualquier contradicción encontrada en docs/legal/aprobaciones-privacidad-v1.0.md. La creación de las entradas de Producto y Operación/release es de S2.T1 (que ya crea las tres entradas), no de esta tarea. Sin scripts ni formatos nuevos.
Contrato: rollback: Revertir con git el cambio de esta tarea en docs/legal/aprobaciones-privacidad-v1.0.md (el registro del resultado de la comparación), sin tocar las entradas creadas por S2.T1 ni el texto de docs/legal/privacidad-v1.0.md.. Status: pending

#### S3.T1 — Bloqueada por pendientes externos (vigencia real, aprobación legal, identidad del responsable, región de Railway, acceso a staging en solo lectura por el túnel). Al fijarse la vigencia real, reemplazar PENDIENTE-VIGENCIA, recalcular el hash con la regla confirmada en S1.T1 y actualizarlo en docs/legal/privacidad-v1.0.md, app/assets/legal/privacidad-v1.0.md, server/legal/privacidad-v1.0.md y en el hash que consumen textos_legales_empaquetados.dart y la suite del servidor, en un solo commit. Comparar con la fila de documento_legal de staging (solo lectura) y registrar la comparación en docs/legal/aprobaciones-privacidad-v1.0.md. No ejecutar legal:registrar.
Contrato: rollback: Revertir el commit de la tarea; vuelve el marcador PENDIENTE-VIGENCIA y el hash previo en todas las copias.. Status: pending
## Verificacion runtime

1. **Qué:** Verificar en runtime: El texto tiene una jerarquía de títulos Markdown sin saltos de nivel, para lector de pantalla y lectura en teléfono y tablet, sin tablas anchas que se corten en pantallas angostas.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
   - **Requiere una persona:** probar con un lector de pantalla (inferido)

## Cambios al modelo de datos

- tipo: seed_catalog | objetos: documento_legal (tipo=privacidad, version=1.0, hash, vigencia) | destructivo: no | tarea: S2.T2 | rollback: Retirar la publicación de privacidad v1.0 sin borrar versiones, hashes ni evidencia de aceptación, y dejar vigente solo una versión aprobada previamente (DEC-222).

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
## Sessions

### Session 1 · T2 · open

**Tasks:**
- [ ] S1.T1
- [ ] S1.T2
- [ ] S1.T3
- [ ] S1.T4
- [ ] S1.T5
- [ ] S1.T6

**Gate (auto)**: El texto fuente de privacidad docs/legal/privacidad-v1.0.md (reemplazo de la versión 1.0, como fija la Adenda 1; la rama 1.1 solo con aprobación del dev) tiene todos los apartados del alcance y el resumen para V-51, ninguna mención de "anónima" dentro del apartado de analítica (con "seudónima" presente), y las copias de app/assets/legal/ y server/legal/ con el mismo hash según la regla confirmada en la primera tarea. Deben pasar cd app && flutter test test/legal/ y node scripts/ci/ep01-legal-provider.mjs. Listo para enviarlo a asesoría legal.

### Session 2 · T1 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T2
- [ ] S2.T3

**Gate (auto)**: La fuente y las copias de app/assets/legal/ y server/legal/ de privacidad-v1.0.md tienen el mismo hash según la regla confirmada en la primera tarea, los tests de hash de app y servidor pasan y el registro docs/legal/aprobaciones-privacidad-v1.0.md está creado (estado pendiente, versión, hash, fecha y observaciones), pendiente de las firmas externas. legal:registrar no se ejecuta.

### Session 3 · T0 · open

**Tasks:**
- [ ] S3.T1

**Gate (strong)**: Sesión bloqueada por pendientes externos: fecha de vigencia real, aprobación legal, identidad legal del responsable y región de Railway, y acceso a staging (solo lectura por el túnel). reviewOutcome: el hash final con la vigencia real es idéntico en la fuente docs/legal/privacidad-v1.0.md, en las copias app/assets/legal/ y server/legal/, y en la fila de documento_legal de staging, y queda registrado en docs/legal/aprobaciones-privacidad-v1.0.md. Verificación humana: QA-03a-15-02 (evento de métrica real de staging contra el apartado de analítica) y QA-03a-15-03 (tablet en horizontal en V-51).

### Session 4 · T0 · open
