---
id: TAO-276-SPEC
project: taomangalam
ticket: TAO-276
status: draft
---

# TAO-276 · Aceptación legal en línea: traza en servidor, Idempotency-Key estable en la app y capacidad documento_legal.aceptar verificada

## Resumen ejecutivo

Qué se hace: (1) se agrega un registro en el servidor por cada aceptación en server/src/legal/aceptacion.ts, con accountRef seudónimo, tipo y versión, sin el texto del documento ni el cuerpo de la petición. Se reutiliza la función de accountRef que ya exista en server/src; si no existe, se crea con HMAC-SHA256 y ACCOUNT_REF_SALT. (2) En la app, aceptarOnline usa una Idempotency-Key estable por intento de aceptación, de modo que el doble toque y el reintento tras una respuesta perdida no dupliquen filas. (3) Se verifica que documento_legal.aceptar esté sembrada como obligatoria y se prueba sobre la ruta real.
Qué NO se hace: la interfaz de V-51 (HU-01-13/14), la cola diferida (HU-03a-12), el bloqueo por versión pendiente (HU-03a-13), el consentimiento de analítica (HU-15-03) ni el registro de documentos por el pipeline (TAO-245 parte 1). No se crea routes/legal.ts.
Cómo se sabe que funciona: un test de Supertest captura el log y confirma accountRef, tipo y versión sin texto ni body. Un test de Supertest con la misma clave confirma dos filas. Un test de widget con doble toque en 'Aceptar y continuar' confirma una sola clave y dos filas. Un test del puerto confirma que el reintento reusa la clave. Un test sobre la ruta real confirma que una cuenta autenticada cualquiera pasa documento_legal.aceptar.
Tamaño: 1 punto, 2 sesiones cortas (servidor y app). ADVERTENCIA: si documento_legal.aceptar falta en el seed del servidor, agregarla es seed_rbac y requiere aprobación humana antes de S1.T3. ADVERTENCIA: el test de regresión de puerto_analitica_test.dart:146 exige claves distintas por llamada en analítica; ese contrato no se toca.

Datos a confirmar antes de ejecutar:
- El script de test real de server/package.json y su runner (vitest o jest), para fijar los verify del servidor. Los comandos de abajo asumen 'pnpm -C server test -- <archivo>'. Se confirma en server/package.json.
- La ruta exacta de routes/legal.ts bajo server/src y el archivo del seed de capacidades del servidor. Se confirma con grep de 'documento_legal.aceptar' en server/src.
- Si ya existe en server/src una función que deriva el accountRef seudónimo y cuál es su nombre. Se confirma con grep de 'accountRef' en server/src.
- El archivo y la firma de aceptarOnline en la app. Se infiere app/lib/features/legal/data/puerto_consentimiento_legal.dart, que maneja documento_legal_modificado en la línea 393. Se confirma con grep de 'aceptarOnline' en app/lib.
- El widget que renderiza 'Aceptar y continuar' y su archivo de test, para ubicar la prueba de doble toque. Se confirma con grep en app/lib y app/test.
- El logger que usa el servidor (pino u otro) y cómo se captura en los tests. Se confirma en server/src.

## Requirements

### REQ-01 `inferred`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:1384 (server/src/legal/aceptacion.ts)

Cada aceptación registrada por POST /legal/aceptaciones deja una entrada de log en el servidor con accountRef seudónimo, tipo de documento y versión. La entrada no incluye el texto del documento, el cuerpo de la petición, el hash ni datos personales. El accountRef se obtiene con la función existente de server/src. Solo si no existe, se crea con HMAC-SHA256 y la sal ACCOUNT_REF_SALT, que no tiene valor por defecto en production (falla al arrancar) y tiene un valor fijo solo en development y test.

### REQ-02 `inferred`
> Fuente: request:criterios-de-aceptacion;adenda-1

En la app, aceptarOnline usa una Idempotency-Key estable por intento de aceptación. El intento se crea al tocar 'Aceptar y continuar' y se conserva mientras no se resuelva. Un doble toque rápido no abre un segundo intento (prueba de widget) y un reintento tras una respuesta perdida reutiliza la misma clave. En el servidor, dos peticiones con la misma Idempotency-Key dejan solo dos filas, una por documento (prueba Supertest).

### REQ-03 `confirmed`
> Fuente: Adenda 2 - 2026-10-11 - dev (correcciones 1 y 4)

La capacidad documento_legal.aceptar existe en el catálogo sembrado del servidor como obligatoria para toda cuenta y figura en el manifiesto empaquetado. Una prueba sobre la ruta real POST /legal/aceptaciones confirma que cualquier cuenta autenticada la pasa. El caso de cuenta con versión legal pendiente (DEC-225) se limita a lo que ya cubre server/src/test/legal/bloqueo-reaceptacion.test.ts en main; si ese archivo no cubre la precondición, el caso se difiere a HU-03a-13 y no se implementa en este ticket.

### REQ-04 `inferred` `variant`
> Fuente: sonda:card-docs-de-superficie-6c8ae176a6

La superficie operativa que cambia queda documentada en docs/development/configuration.md: la variable ACCOUNT_REF_SALT (solo si se crea), su obligatoriedad en production, el valor fijo en development y test, y los campos del log de aceptación legal (accountRef, tipo, versión, sin texto). Si se reutiliza una derivación existente, se documenta el campo del log y se referencia la variable ya documentada. Un test de configuración concreto falla si el código del servidor lee ACCOUNT_REF_SALT y docs/development/configuration.md no la menciona.

### REQ-05 `confirmed` `variant`
> Fuente: sonda:card-lint-de-docs-4d9deffd06

Al modificar docs/development/configuration.md, que figura en .docs-baseline.txt, el archivo queda compliant con el linter de docs del repo, de modo que el job de docs y el quality-gate quedan en verde.

### REQ-06 `confirmed` `enforcement`
> Fuente: Adenda 2 - 2026-10-11 - dev (correcciones 1 y 2)

Restricciones de reuso. No crear routes/legal.ts: ubicar el existente bajo server/src con Glob. Reutilizar la derivación de accountRef existente antes de crear una. En la app, reutilizar el generador de claves ULID ya inyectado como generarClave. Las pruebas legales del servidor viven en server/src/test/legal/ (aceptar-online.test.ts, migracion-legal.test.ts, bloqueo-reaceptacion.test.ts): se amplían esos archivos y no se crea un archivo nuevo duplicado en otra ruta. Quedan fuera del alcance solo las pruebas de cola diferida (cola-offline) y de analítica (puerto_analitica). El test del reintento con la misma Idempotency-Key vive en puerto_consentimiento_legal_test.dart (o en el test de aceptarOnline que se localice con Glob bajo app/test/legal/) y se permite agregar casos allí.
## Tasks

#### S1.T1 — Ubicar bajo server/src la función existente que deriva el accountRef seudónimo y reutilizarla. Solo si no existe, crearla con HMAC-SHA256 y ACCOUNT_REF_SALT: en production sin valor la app falla al arrancar, y en development y test usa un valor fijo.
Contrato: rollback: Revertir el commit. Si se creó el módulo de derivación, borrarlo junto con la lectura de ACCOUNT_REF_SALT.. Status: pending

#### S1.T2 — En server/src/legal/aceptacion.ts, después de insertar cada fila de aceptación, emitir una entrada de log con el logger del servidor y los campos accountRef, tipo y version, sin texto, body, hash ni datos personales. No crear routes/legal.ts: si hace falta tocar la ruta, ubicar el archivo existente bajo server/src.
Contrato: rollback: Revertir el commit sobre server/src/legal/aceptacion.ts.. Status: pending

#### S1.T3 — Verificar en el seed de capacidades del servidor que documento_legal.aceptar existe y es obligatoria, y contrastarlo con app/assets/manifiesto/estandar.json:23. Si falta, NO agregarla sin la aprobación humana seed_rbac: detenerse y reportar.
Contrato: rollback: Si se agregó con aprobación, revertir el commit del seed. Si solo se verificó, no hay nada que revertir.. Status: pending

#### S1.T5 — Documentar en docs/development/configuration.md la superficie operativa (variable ACCOUNT_REF_SALT solo si se creó, obligatoriedad en production, valor fijo en development y test, y campos del log de aceptación legal: accountRef, tipo, versión, sin texto), dejando el archivo compliant con el linter de docs (figura en .docs-baseline.txt). Agregar además el test de configuración server/src/test/config/account-ref-salt-docs.test.ts que falla si el código bajo server/src lee ACCOUNT_REF_SALT y docs/development/configuration.md no la menciona. Si se reutilizó una derivación existente de accountRef, el test pasa de forma trivial y solo se documenta el campo del log.
Contrato: rollback: Revertir los casos agregados al archivo de test.. Status: pending

#### S1.T6 — Pruebas del servidor sobre la ruta real POST /legal/aceptaciones, ampliando los archivos existentes de server/src/test/legal/ (aceptar-online.test.ts, migracion-legal.test.ts, bloqueo-reaceptacion.test.ts) sin crear un archivo duplicado: (a) entrada de log con accountRef, tipo y versión, sin texto ni cuerpo de la petición; (b) dos peticiones con la misma Idempotency-Key dejan solo dos filas, una por documento (Supertest); (c) documento_legal.aceptar existe como obligatoria en el catálogo sembrado y cualquier cuenta autenticada la pasa; (d) el caso de versión pendiente se limita a lo que ya cubre bloqueo-reaceptacion.test.ts y, si no cubre la precondición, se difiere a HU-03a-13. Quedan excluidas solo las pruebas de cola diferida (cola-offline) y de analítica (puerto_analitica).
Contrato: rollback: Eliminar el archivo de prueba creado por esta task y revertir cualquier ajuste de ubicación.. Status: pending

#### S2.T1 — En la app, localizar con Glob el widget de 'Aceptar y continuar' y su test de widget existente, nombrar ambos archivos en esta task y trabajar sobre ellos. aceptarOnline usa una Idempotency-Key estable por intento (reutilizando generarClave), creada al tocar 'Aceptar y continuar' y conservada mientras no se resuelva. Agregar el test de widget del doble toque (solo un intento y dos aceptaciones, una por documento) y el caso de reintento tras respuesta perdida con la misma clave en puerto_consentimiento_legal_test.dart o en el test de aceptarOnline localizado con Glob bajo app/test/legal/. Quedan excluidas solo las pruebas de cola diferida (cola-offline) y de analítica (puerto_analitica).
Contrato: rollback: Revertir el commit sobre el archivo de aceptarOnline y el widget de 'Aceptar y continuar'.. Status: pending

#### S2.T2 — Tests en app/test/legal: (a) en puerto_consentimiento_legal_test.dart, una respuesta perdida seguida de un reintento usa la misma clave y deja 2 aceptaciones en un puerto falso con idempotencia por clave, y un intento nuevo tras el 201 usa otra clave; (b) un test de widget de doble toque rápido en 'Aceptar y continuar' (QA-03a-11-02) envía una sola clave y deja 2 aceptaciones; (c) regresión de V-51 ante documento_legal_modificado.
Contrato: rollback: Revertir los tests agregados.. Status: pending
## Cambios al modelo de datos

- tipo: seed_rbac | objetos: capacidad documento_legal.aceptar (seed de capacidades del servidor) | destructivo: no | tarea: S1.T3 | rollback: Revertir el commit que agrega la capacidad al seed y quitar la fila sembrada. Solo aplica si la verificación encuentra que falta; si ya existe, no hay cambio.

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-02 (edit) `inferred`: En la app, aceptarOnline usa una Idempotency-Key estable por intento de aceptación. El intento se crea al tocar 'Aceptar y continuar' y se c
- REQ-04 (edit) `inferred`: La superficie operativa que cambia queda documentada en docs/development/configuration.md: la variable ACCOUNT_REF_SALT (solo si se crea), s
- REQ-05 (edit) `confirmed`: Al modificar docs/development/configuration.md, que figura en .docs-baseline.txt, el archivo queda compliant con el linter de docs del repo,
- REQ-06 (edit) `confirmed`: Restricciones de reuso. No crear routes/legal.ts: ubicar el existente bajo server/src con Glob. Reutilizar la derivación de accountRef exist

**Tasks agregadas:**

- S1: Localizar con Glob bajo server/ los archivos de prueba de legal (por ejemplo server/src/legal/aceptar-online.test.ts) y routes/legal.ts. Si el archivo de prueba no existe, crearlo en este ticket; no crear routes/legal.ts. No agregar pruebas de cola diferida, puerto de consentimiento legal ni analítica. (valida: REQ-06; rollback: Eliminar el archivo de prueba creado por esta task y revertir cualquier ajuste de ubicación.)

### Enmienda 2
**REQs:**

- REQ-06 (edit) `confirmed`: Restricciones de reuso. No crear routes/legal.ts: ubicar el existente bajo server/src con Glob. Reutilizar la derivación de accountRef exist
- REQ-03 (edit) `confirmed`: La capacidad documento_legal.aceptar existe en el catálogo sembrado del servidor como obligatoria para toda cuenta y figura en el manifiesto
- REQ-04 (edit) `inferred`: La superficie operativa que cambia queda documentada en docs/development/configuration.md: la variable ACCOUNT_REF_SALT (solo si se crea), s

**Task ops:**

- edit S1.T5 { desc="Documentar en docs/development/configuration.md la superficie operativa (variable ACCOUNT_REF_SALT solo si se creó, obligatoriedad en production, valor fijo en development y test, y campos del log de aceptación legal: accountRef, tipo, versión, sin texto), dejando el archivo compliant con el linter de docs (figura en .docs-baseline.txt). Agregar además el test de configuración server/src/test/config/account-ref-salt-docs.test.ts que falla si el código bajo server/src lee ACCOUNT_REF_SALT y docs/development/configuration.md no la menciona. Si se reutilizó una derivación existente de accountRef, el test pasa de forma trivial y solo se documenta el campo del log.", validates=["REQ-04","REQ-05"], isTest=false, verify=["npm --prefix server test -- src/test/config/account-ref-salt-docs.test.ts"] }
- edit S1.T6 { desc="Pruebas del servidor sobre la ruta real POST /legal/aceptaciones, ampliando los archivos existentes de server/src/test/legal/ (aceptar-online.test.ts, migracion-legal.test.ts, bloqueo-reaceptacion.test.ts) sin crear un archivo duplicado: (a) entrada de log con accountRef, tipo y versión, sin texto ni cuerpo de la petición; (b) dos peticiones con la misma Idempotency-Key dejan solo dos filas, una por documento (Supertest); (c) documento_legal.aceptar existe como obligatoria en el catálogo sembrado y cualquier cuenta autenticada la pasa; (d) el caso de versión pendiente se limita a lo que ya cubre bloqueo-reaceptacion.test.ts y, si no cubre la precondición, se difiere a HU-03a-13. Quedan excluidas solo las pruebas de cola diferida (cola-offline) y de analítica (puerto_analitica).", validates=["REQ-01","REQ-02","REQ-03","REQ-06"], isTest=true, verify=["npm --prefix server test -- src/test/legal/aceptar-online.test.ts","npm --prefix server test -- src/test/legal/bloqueo-reaceptacion.test.ts"] }
- edit S2.T1 { desc="En la app, localizar con Glob el widget de 'Aceptar y continuar' y su test de widget existente, nombrar ambos archivos en esta task y trabajar sobre ellos. aceptarOnline usa una Idempotency-Key estable por intento (reutilizando generarClave), creada al tocar 'Aceptar y continuar' y conservada mientras no se resuelva. Agregar el test de widget del doble toque (solo un intento y dos aceptaciones, una por documento) y el caso de reintento tras respuesta perdida con la misma clave en puerto_consentimiento_legal_test.dart o en el test de aceptarOnline localizado con Glob bajo app/test/legal/. Quedan excluidas solo las pruebas de cola diferida (cola-offline) y de analítica (puerto_analitica).", validates=["REQ-02","REQ-06"] }
## Sessions

### Session 1 · T2 · open

**Tasks:**
- [ ] S1.T1
- [ ] S1.T2
- [ ] S1.T3
- [ ] S1.T5
- [ ] S1.T6

**Gate (auto)**: El test de Supertest de server/src/legal/aceptar-online.test.ts pasa con las aserciones de log (accountRef, tipo y versión sin texto), de dos filas con la misma Idempotency-Key y de capacidad sobre la ruta real. Además, configuration.md pasa el linter de docs.

### Session 2 · T1 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T2

**Gate (auto)**: En app/test/legal, el test del puerto muestra que el reintento tras una respuesta perdida reusa la clave, y el test de widget muestra que el doble toque en 'Aceptar y continuar' envía una sola clave y deja 2 aceptaciones. Los tests existentes de cola-offline y puerto_analitica siguen en verde.

### Session 3 · T0 · open
