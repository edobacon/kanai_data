---
id: TAO-221-SPEC
project: taomangalam
ticket: TAO-221
status: draft
---

# TAO-221 · Spike: verificación de integridad del dispositivo (App Attest y Play Integrity) para el alta automática y DEC de implementación

## Resumen ejecutivo

Se evalúan App Attest (iOS/iPadOS 15+) y Play Integrity (Android minSdk 24) para el alta pública autenticarCuentaDispositivo. Se hace una prueba de concepto descartable en ambos sistemas contra un endpoint de prueba que no se despliega, y se redacta una DEC nueva con la opción elegida, las descartadas, la conducta del servidor ante fallo o indisponibilidad, el impacto en el contrato (integridad_dispositivo_fallida y el campo de AltaCuentaDispositivoRequest) y la corrección o confirmación de la estimación de HU-03a-05. NO incluye la implementación productiva de la verificación ni del límite de frecuencia (HU-03a-05), ni el alta de la cuenta de dispositivo (HU-03a-03), ni cambios en tablas. Se considera terminado cuando la DEC tiene la tabla comparativa con mecanismo, versión mínima, costo y cuota, latencia medida y conducta ante fallo por plataforma, con los resultados QA-03a-01-01..03 documentados, el contrato tiene el cambio enlazado, la tabla de la épica refleja la estimación revisada y no queda en el repo ningún rastro del endpoint de prueba ni de credenciales. Tamaño: 3 puntos, 2 sesiones. ADVERTENCIA: el trabajo está bloqueado hasta tener cuentas de Apple Developer y Google Play Console con App Attest y Play Integrity habilitados, y necesita QA humana con un iPhone físico, un Android físico con servicios de Google y un emulador sin ellos; un agente no puede producir por sí solo las mediciones en dispositivo. ADVERTENCIA: la declaración de privacidad se limita a indicarla para HU-03a-15; no se edita aquí.

Datos a confirmar antes de ejecutar:
- Número de la DEC nueva y ruta/plantilla donde viven las DEC en taomangalam (no figura en el contexto; confirmar en docs/ del repo).
- Archivo del contrato OpenAPI donde se define AltaCuentaDispositivoRequest y la lista de códigos de error con integridad_dispositivo_fallida (solo se ve el cliente generado en app/lib/features/cuenta/data/puerto_registro_api.dart:31; confirmar la fuente del contrato).
- Comando local del lint de docs (existe .docs-baseline.txt, pero no figura el script; confirmar en package.json raíz o en .github/workflows).
- Librerías Node para verificar la atestación de App Attest y para llamar a la API de Play Integrity (decodeIntegrityToken), con sus versiones: no están en el contexto; confirmarlas al iniciar la PoC.
- Disponibilidad y titular de las cuentas de Apple Developer y Google Play Console y del proyecto de Google Cloud vinculado.

## Requirements

#### REQ-01 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:95
> Necesidad: build
La DEC nueva incluye, para iOS (App Attest) y Android (Play Integrity), una tabla comparativa con el mecanismo, la versión mínima de sistema soportada, el costo y la cuota, la dependencia de servicios de Google, la latencia medida en el primer uso y la forma de verificar en el servidor con Node. Por qué: es el insumo con el que HU-03a-05 implementa y HU-03a-03 envía la prueba.

#### REQ-02 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:107
> Necesidad: build
Una prueba de concepto descartable en iOS y Android obtiene la prueba de integridad y la envía a un endpoint de prueba que la verifica en el servidor; el endpoint rechaza pruebas reutilizadas o alteradas y los resultados quedan documentados en la DEC. Por qué: la decisión debe apoyarse en resultados observados y no en documentación del proveedor.

#### REQ-03 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:183
> Necesidad: build
La DEC fija qué responde el servidor cuando la verificación falla o no está disponible (rechazo con integridad_dispositivo_fallida, alta con límite más estricto o alta sin verificación con registro en intento_seguridad), distinguiendo Android sin servicios de Google, emuladores, builds development, sistema antiguo sin soporte y falta de red al obtener la prueba. Por qué: es la regla que HU-03a-05 implementa y la que evita bloquear instalaciones legítimas.

#### REQ-04 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:182
> Necesidad: build
El contrato queda indicado: si integridad_dispositivo_fallida pasa de reservado a activo y qué campo de AltaCuentaDispositivoRequest transporta la prueba, con el cambio de contrato enlazado desde la DEC. Por qué: HU-03a-03 lo necesita para enviar la prueba desde la app.

#### REQ-05 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:148
> Necesidad: build
Con la DEC aprobada, la estimación de HU-03a-05 se confirma o se corrige en la tabla de la épica EP-03a, y la DEC explica el motivo. Por qué: el spike existe para reducir el riesgo alto de esa historia.

#### REQ-06 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:198
> Necesidad: build
La DEC define la seguridad, la privacidad y la observabilidad: la prueba cruda nunca se guarda en logs, qué se registra ante un fallo (resultado y motivo, sin la prueba), qué datos del dispositivo recibe cada proveedor y si deben declararse en privacidad (HU-03a-15). Por qué: es requisito transversal explícito del request.

#### REQ-07 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:153
> Necesidad: build
El código de la PoC y el endpoint de prueba son descartables: no se despliegan ni quedan en el manifiesto, y no se commitean credenciales de Apple ni de Google; solo se conservan la DEC y las mediciones. Por qué: rollback y comprobación definidos en el handoff.

#### REQ-08 `inferred`
> Fuente: taomangalam/app/lib/features/cuenta/data/puerto_registro_api.dart:6
> Necesidad: build
La DEC sigue el formato y la numeración de las DEC existentes y cita DEC-212, DEC-214, DEC-163 y DEC-198 como antecedentes, y respeta el estado actual del cliente de alta en puerto_registro_api.dart (FallaDeRed para 429/5xx). Por qué: consistencia con las decisiones y el código ya integrados.

## Tasks

#### S1.T1 — Prueba de concepto descartable en iOS y Android contra un endpoint de prueba local, fuera de la rama de entrega (o en commits que se descartan). Requiere cuentas de Apple Developer y Google Play Console con App Attest y Play Integrity habilitados; sin ellas no se inicia.
Contrato: rollback: Borrar el código de la PoC y el endpoint de prueba; no hay nada desplegado ni commiteado en la rama de entrega.. Status: pending
Subtasks: 4 (ejecutar hojas; el padre espera a todas)

#### S1.T1.1 — Endpoint de prueba en Node, solo local, que emite un desafío de un solo uso, verifica la atestación de App Attest y decodifica el token de Play Integrity, y rechaza desafíos repetidos o pruebas alteradas. No registra la prueba cruda en logs.
Contrato: rollback: Eliminar el endpoint de prueba local; no se toca server/src/routes/cuenta.ts.. Status: pending

#### S1.T1.2 — Cliente mínimo iOS (iPadOS/iOS 15+) que genera la clave de App Attest, pide la atestación sobre el desafío y la envía al endpoint, midiendo el tiempo del primer uso.
Contrato: rollback: Descartar el cliente de prueba iOS.. Status: pending

#### S1.T1.3 — Cliente mínimo Android (minSdk 24, ver app/android/app/build.gradle.kts:27) que solicita el token de Play Integrity sobre el desafío y lo envía al endpoint, midiendo el tiempo del primer uso y capturando el error literal cuando no hay servicios de Google.
Contrato: rollback: Descartar el cliente de prueba Android.. Status: pending

#### S1.T1.4 — Volcar a la DEC en borrador la tabla comparativa por plataforma (mecanismo, versión mínima, costo, cuota, dependencia de Google, latencia medida, verificación en Node) con las cifras observadas.
Contrato: rollback: Revertir el archivo de la DEC en borrador.. Status: pending

#### S1.T2 — QA humana de la PoC: ejecutar QA-03a-01-01 (iPhone físico iOS 15+), QA-03a-01-02 (emulador Android sin Play Store) y QA-03a-01-03 (prueba reutilizada y alterada contra el endpoint), más el Android físico con Google; registrar resultado, error literal y tiempo en ms en la DEC en borrador.
Contrato: rollback: Retirar de la DEC las mediciones registradas.. Status: pending

#### S2.T1 — Completar la DEC con la tabla de conducta del servidor por caso (sin Google, emulador, build development, sistema antiguo, sin red, prueba inválida), la opción elegida entre las tres del request y las descartadas con motivo, los antecedentes DEC-212, DEC-214, DEC-163 y DEC-198, y la distinción frente a FallaDeRed y VersionLegalPendiente del cliente actual (app/lib/features/cuenta/data/puerto_registro_api.dart:6-11).
Contrato: rollback: Revertir el archivo de la DEC.. Status: pending

#### S2.T2 — Sección de seguridad, privacidad y observabilidad de la DEC: campos a registrar en intento_seguridad ante fallo (resultado y motivo, sin prueba cruda), datos del dispositivo que recibe Apple y Google y si se declaran en HU-03a-15.
Contrato: rollback: Revertir la sección en la DEC.. Status: pending

#### S2.T3 — Impacto en contrato y épica: indicar en EP-03a (líneas 182, 186 y 212) si integridad_dispositivo_fallida pasa a activo, definir el campo de AltaCuentaDispositivoRequest que transporta la prueba sin alterar codigoDispositivo, secreto, dispositivo, locale ni timezoneId, enlazar el cambio de contrato desde la DEC y confirmar o corregir los puntos de HU-03a-05 en la tabla de la épica.
Contrato: rollback: Revertir los cambios en EP-03a y en el contrato.. Status: pending

#### S2.T4 — Regresión y cierre: confirmar que el diff de la rama solo toca la DEC, EP-03a y el contrato; buscar en el repo la ruta del endpoint de prueba y las variables de credenciales de los proveedores (sin resultados fuera de la DEC); correr el lint de docs del repo sobre la DEC y EP-03a.
Contrato: rollback: No aplica (solo verificación); si aparece código de la PoC, descartarlo.. Status: pending

## Cambios al modelo de datos

Ninguno.
