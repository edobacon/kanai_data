---
id: TAO-245-SPEC
project: taomangalam
ticket: TAO-245
status: draft
---

# TAO-245 · Registro legal en el pipeline, apertura de urlPublicada y aceptación en línea con traza, clave de idempotencia estable y capacidad verificada

## Resumen ejecutivo

Se hace: (1) el workflow de despliegue de staging invoca el script existente `pnpm legal:registrar --autor pipeline` con MIGRATION_DATABASE_URL sin imprimir secretos, y una guarda de CI falla nombrando el paso si desaparece; el script verifica también que el hash de app/assets/legal coincida con la fuente (DEC-222) y el runbook lo documenta; la app abre `urlPublicada` con url_launcher cuando la versión no viene empaquetada y hay conexión; (2) el servidor registra cada aceptación con accountRef, tipo y versión sin texto ni cuerpo; `aceptarOnline` reutiliza una Idempotency-Key por intento; una prueba Supertest confirma `documento_legal.aceptar` obligatoria sobre la ruta real. No se hace: redacción de textos (HU-03a-14/15), cola diferida (HU-03a-12), bloqueo por versión pendiente (HU-03a-13), interfaz de V-51 (HU-01-13/14), portal (EP-16) ni app_release (EP-17). Cómo se sabe que funciona: guarda de CI en rojo sin el paso, log de staging con tipo/versión/hash, prueba de widget del doble toque con exactamente dos filas, reintento con la misma clave sin duplicar, log de aceptación sin texto y prueba de capacidad en verde. Tamaño: 3 puntos, 2 sesiones (T2 + T1), riesgo bajo. ADVERTENCIAS: si `documento_legal.aceptar` no figura en el catálogo sembrado, agregarla es un seed_rbac que requiere aprobación humana y queda fuera del plan actual (hoy se asume presente por app/assets/manifiesto/estandar.json:23). La evidencia en staging y la QA en dispositivo se hacen en emulador (Adenda 1); la prueba en dispositivo real queda pendiente y no bloquea el cierre. DEC-222: se elige comparar el hash en el script además de CI (chequeo barato antes de insertar); la alternativa es solo documentar el chequeo de CI actual.

Datos a confirmar antes de ejecutar:
- Ruta exacta del workflow de staging (se asume .github/workflows/deploy-staging.yml) y si el pre-deploy de Railway se configura en el repo (railway.toml o similar) o solo en el panel.
- Ubicación del script `legal:registrar` (package.json raíz o server/) y del chequeo de CI actual de hashes, para colgar la guarda y la comparación.
- Runner de tests del servidor (vitest o jest) y nombre del paquete pnpm, para fijar los comandos de verify (se usa `pnpm --dir server test -- <patrón>`).
- Logger usado por el servidor (pino u otro) y cómo se deriva hoy el accountRef seudónimo.
- Archivo exacto de `aceptarOnline` en app/lib/features/legal (se asume junto a puerto_consentimiento_legal.dart) y del lector del documento en V-51 que hoy muestra 'texto no disponible sin conexión'.

## Requirements

### REQ-01 `inferred`
> Fuente: request HU-03a-10 Incluye; taomangalam/docs/development/release-runbook.md (paso pnpm legal:registrar)

El workflow de despliegue de staging ejecuta `pnpm legal:registrar --autor pipeline` con MIGRATION_DATABASE_URL, inserta la versión nueva con hash_contenido = SHA-256 del Markdown, url_publicada informada y texto_snapshot nulo, sin tocar versiones anteriores, y deja en el log tipo, versión y hash sin la cadena de conexión.

### REQ-02 `confirmed`
> Fuente: Adenda 3: cubrir REQ-11 en la guarda de S1.T3/S1.T6

Una guarda de CI falla, nombrando el paso faltante, si el workflow deploy-staging.yml deja de invocar `legal:registrar --autor pipeline` o si ese paso deja de recibir MIGRATION_DATABASE_URL con el nombre exacto del secret o variable que ya existe en el workflow (REQ-11). La guarda no imprime ni exige el valor del secret.

### REQ-03 `inferred`
> Fuente: pedido de cambio: delimitar S1.T8 y S1.T10

Si el hash del texto empaquetado en app/assets/legal difiere del de la fuente docs/legal, el registro falla antes de insertar y el chequeo de CI actual sigue fallando. La comparación vive y se prueba en su propio archivo server/src/legal/comparar-fuente-empaquetado.test.ts, distinto del de REQ-12; el punto de verificación queda documentado (DEC-222).

### REQ-04 `inferred`
> Fuente: taomangalam/app/lib/features/legal/data/textos_legales_empaquetados.dart:13-24

Cuando la versión pedida desde V-51 no tiene texto empaquetado y hay conexión, la app abre su urlPublicada con url_launcher; sin conexión muestra el aviso de texto no disponible.

### REQ-08 `confirmed` `variant`
> Fuente: sonda:card-docs-de-superficie-6c8ae176a6

docs/development/release-runbook.md, donde ya vive el paso de registro legal, indica que el registro legal ahora corre en el workflow de despliegue deploy-staging.yml con `pnpm legal:registrar --autor pipeline`, documenta su uso y parámetros, dónde se verifica el hash empaquetado (DEC-222) e incluye un ejemplo del log con tipo, versión y hash, sin la cadena de conexión. El runbook deja explícito que el pre-deploy de Railway queda fuera de este alcance: no ejecuta el registro legal y no se modifica.

### REQ-09 `confirmed` `enforcement`
> Fuente: adendas 2, 4 y 5 (corte B) y pedido de enmienda punto 1

Reusar lo existente: el script `pnpm legal:registrar` (SHA-256, idempotente, sin texto_snapshot) y url_launcher ya presente; las tablas siguen append-only y no se agrega endpoint de escritura de documentos. Regresión: server/src/test/legal/aceptar-online.test.ts y server/src/test/legal/migracion-legal.test.ts siguen en verde (el ejecutor confirma su ruta real con Glob bajo server/ antes de usarla), y no existen rutas POST/PUT nuevas bajo /legal/documentos. No se crean ni se mueven esos archivos. Límite del corte B: este ticket cubre solo QA-03a-10-*. La traza con accountRef, la derivación con HMAC-SHA256 y la variable ACCOUNT_REF_SALT (sin valor por defecto en production, valor fijo solo en development y test, documentada en docs/development/configuration.md), la clave de idempotencia estable y los QA-03a-11-* pasan a TAO-276 y no se implementan aquí. Si el ejecutor necesita referirse a un accountRef, solo reutiliza la función existente en server/src si existe y no crea ninguna.

### REQ-11 `confirmed` `enforcement`
> Fuente: adenda 2 (Q2) y pedido de enmienda punto 2

El paso de registro en deploy-staging.yml toma el nombre de MIGRATION_DATABASE_URL del secret o variable que ya existe en ese workflow, sin inventar nombres. Si el entorno del workflow no lo tiene configurado, el ejecutor se detiene y lo reporta como pendiente externo.

### REQ-12 `confirmed`
> Fuente: pedido de cambio: delimitar S1.T8 y S1.T10

Existe una prueba automatizada del script de registro contra base, en su propio archivo server/src/legal/registrar-legal.test.ts, que cubre REQ-01 y REQ-18: inserta con hash SHA-256 del Markdown, url_publicada informada y texto_snapshot nulo; registra tipo, versión y hash en el log sin la cadena de conexión; es idempotente (una segunda corrida con el mismo hash no duplica ni modifica filas); ante una versión ya registrada con hash distinto no modifica la fila existente y falla sin insertar; y no toca versiones anteriores. La comparación docs/legal frente a app/assets/legal NO se prueba aquí (la cubre REQ-03 en su propio archivo).

### REQ-13 `confirmed`
> Fuente: Adenda 6 punto 5

Se deja evidencia de la ejecución del registro legal en staging: el log del despliegue con tipo, versión y hash de cada documento, sin la cadena de conexión, adjunto en el runbook o en el ticket. QA-03a-10-01 (GET /v1/legal/documentos devuelve términos y privacidad con su hash) se valida con esa evidencia de staging; sin ella queda pendiente externo junto con la evidencia. El gate de la sesión 2 declara la evidencia o su estado pendiente (pendiente externo si el despliegue en staging no se puede ejecutar por falta de configuración o sin confirmación del dev, REQ-16).

### REQ-16 `confirmed` `enforcement`
> Fuente: Adenda 3: el despliegue real en staging (S2.T5) requiere confirmación explícita del dev

El despliegue real a staging solo se ejecuta tras la confirmación explícita del dev en el momento de correrlo. Sin esa confirmación, la evidencia de REQ-13 se reporta como pendiente.

### REQ-17 `confirmed` `enforcement`
> Fuente: Adenda 3: reutilizar el mecanismo de conectividad existente en S1.T4

La decisión de abrir urlPublicada con conexión reutiliza el mecanismo de conectividad que la app ya usa. No se agrega una dependencia ni una verificación de red nueva.

### REQ-18 `confirmed`
> Fuente: Adenda 3: el caso de hash distinto asume un cambio de comportamiento; confirmar y, si no existe, implementar

Antes de implementar, el ejecutor confirma en el código del script `legal:registrar` si ya falla cuando el hash de docs/legal difiere del de app/assets/legal. Si ya existe, solo se agrega o confirma la prueba. Si no existe, lo implementa como task de código: el registro aborta antes de insertar y sin escribir ninguna fila.

### REQ-19 `confirmed` `enforcement`
> Fuente: Adenda 3: unificar los comandos verify con el runner real del server

Todos los comandos verify de las tasks de server usan el runner real del paquete server, tomado de server/package.json (scripts) y no inventado, y apuntan solo al archivo de test que la task toca.

### REQ-21 `confirmed` `enforcement`
> Fuente: Adenda 6 punto 2

La guarda de CI del workflow de despliegue (paso `legal:registrar --autor pipeline` presente y con MIGRATION_DATABASE_URL, REQ-02 y REQ-11) y su prueba viven en un único archivo de test: server/src/legal/guarda-workflow-registro.test.ts. Las tasks S1.T3 y S1.T6 lo comparten y su verify apunta solo a ese archivo.

### REQ-22 `confirmed`
> Fuente: QA-03a-10-05

Una prueba de servidor cubre QA-03a-10-05: GET /legal/terminos/9.9 (versión inexistente) responde 404 sin exponer detalles internos (sin stack trace, rutas ni mensajes de base de datos). Cubre también, una sola vez, el caso de una versión sin exige_reaceptacion, que no exige nueva aceptación. La prueba localiza con Glob la ruta real de routes/legal.ts bajo server/src sin crearla.
## Tasks

#### S1.T1 — Agregar en .github/workflows/deploy-staging.yml el paso que ejecuta `pnpm legal:registrar --autor pipeline`, escrito una sola vez (incluye el contenido que antes era S2.T4). Tomar para MIGRATION_DATABASE_URL el nombre exacto del secret o variable que ya existe en ese workflow; si el entorno no lo tiene configurado, detenerse y reportarlo como pendiente externo sin inventar nombres (REQ-11). El paso no imprime la cadena de conexión y deja en el log tipo, versión y hash.
Contrato: rollback: Revertir el commit del workflow; las filas ya insertadas en documento_legal se conservan (append-only).. Status: pending

#### S1.T3 — Guarda de CI que falla nombrando el paso faltante si deploy-staging.yml deja de invocar `legal:registrar --autor pipeline` o de recibir MIGRATION_DATABASE_URL con el nombre exacto del secret existente. También revisa que docs/development/release-runbook.md mencione `legal:registrar --autor pipeline`. No imprime ni exige el valor del secret.
Contrato: rollback: Quitar el script de guarda y su invocación del job de CI.. Status: pending

#### S1.T4 — En la app, abrir `urlPublicada` con url_launcher cuando la versión pedida desde V-51 no tiene texto empaquetado y hay conexión, reutilizando el mecanismo de conectividad que la app ya usa (sin agregar dependencia ni una verificación de red nueva). Sin conexión, mostrar el aviso de texto no disponible (REQ-04, REQ-17).
Contrato: rollback: Revertir el cambio del lector; vuelve el aviso de texto no disponible en todos los casos sin empaquetar.. Status: pending

#### S1.T5 — Actualizar docs/development/release-runbook.md: el registro corre en el workflow con --autor pipeline, dónde se verifica el hash empaquetado (script + CI) y ejemplo de log con tipo, versión y hash sin cadena de conexión.
Contrato: rollback: Revertir el commit del runbook.. Status: pending

#### S1.T6 — Prueba de la guarda: el workflow sin el paso de registro (REQ-11) hace fallar la guarda nombrando el paso faltante; también falla si release-runbook.md no menciona `legal:registrar --autor pipeline`.
Contrato: rollback: Borrar los archivos de test nuevos.. Status: pending

#### S1.T8 — Prueba del script de registro contra base en server/src/legal/registrar-legal.test.ts (REQ-12): inserción con SHA-256, url_publicada y texto_snapshot nulo, log con tipo, versión y hash sin cadena de conexión, idempotencia, versión ya registrada con hash distinto (falla sin modificar la fila) y versiones anteriores intactas. No prueba la comparación docs/legal frente a app/assets/legal (eso es S1.T10, otro archivo). Incluye la regresión de REQ-09: server/src/test/legal/aceptar-online.test.ts y server/src/test/legal/migracion-legal.test.ts siguen en verde, y no hay rutas POST/PUT nuevas bajo /legal/documentos. El runner se toma de server/package.json (REQ-19).
Contrato: rollback: Borrar server/src/legal/registrar-legal.test.ts. No toca el código del script, ni filas, ni versiones registradas.. Status: pending

#### S1.T10 — Confirmar en el script legal:registrar si ya compara el hash de docs/legal con app/assets/legal antes de insertar; implementar solo si falta (REQ-18, REQ-03). Su prueba vive en su propio archivo server/src/legal/comparar-fuente-empaquetado.test.ts y solo cubre esa comparación (no idempotencia ni versión con hash distinto, que son de S1.T8). Documentar dónde se verifica (DEC-222). El runner se toma de server/package.json (REQ-19).
Contrato: rollback: Revertir el commit de la comparación de hash y de su prueba; no se tocan tablas ni filas registradas.. Status: pending

#### S1.T11 — Escribir pruebas que validan REQ-04 y REQ-17: (a) prueba unitaria de la decisión de abrir `urlPublicada` cuando la versión pedida no tiene texto empaquetado y hay conexión, y de mostrar el aviso de texto no disponible sin conexión, usando el mecanismo de conectividad que la app ya utiliza (sin agregar dependencia ni verificación de red nueva); (b) prueba de widget con una versión sin empaquetar que verifica que se invoca `url_launcher` con la `urlPublicada` con conexión y que sin conexión se muestra el aviso. Ubicar el archivo de test bajo app/test junto a los tests existentes del documento legal (localizarlo con Glob antes de crear) y ajustar el verify a esa ruta concreta.
Contrato: rollback: Eliminar los archivos de test agregados bajo app/test; no altera código de producción.. Status: pending

#### S1.T12 — Prueba de servidor (isTest) para QA-03a-10-05 y el caso de versión sin exige_reaceptacion. Localizar con Glob la ruta real de routes/legal.ts bajo server/src (no crearla) y el patrón de test Supertest existente en server/src/legal/. Escribir server/src/legal/documento-version.test.ts con: (1) GET /legal/terminos/9.9 responde 404 sin stack trace, rutas ni detalles internos en el cuerpo; (2) una versión registrada sin exige_reaceptacion no exige nueva aceptación. Usar el runner real de server/package.json (REQ-19).
Contrato: rollback: Eliminar server/src/legal/documento-version.test.ts; no toca código de producción.. Status: pending

#### S2.T5 — Evidencia del registro legal en staging (REQ-13, REQ-16). Solo con confirmación explícita del dev en el momento de correrlo, ejecutar el despliegue a staging y adjuntar en el runbook o en el ticket el log con tipo, versión y hash de cada documento, sin la cadena de conexión. QA-03a-10-01 (GET /v1/legal/documentos devuelve términos y privacidad con su hash) se valida con esa evidencia de staging; sin confirmación o sin configuración del entorno, la evidencia y QA-03a-10-01 quedan como pendiente externo y el gate lo declara así.
Contrato: rollback: Revertir la sección de evidencia del runbook; el registro en staging es append-only y no se borra.. Status: pending
## Cambios al modelo de datos

Ninguno.

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-10 (add) `confirmed`: Para el accountRef seudónimo del log de aceptaciones, el ejecutor busca primero en server/src una función existente que derive el accountRef
- REQ-11 (add) `confirmed`: El paso de registro en deploy-staging.yml usa para MIGRATION_DATABASE_URL el nombre exacto del secret o variable que ya existe en ese workfl
- REQ-12 (add) `confirmed`: Existe una prueba automatizada del script de registro (pnpm legal:registrar) que cubre REQ-01: inserta con hash SHA-256 del Markdown, url_pu
- REQ-13 (add) `confirmed`: Se deja evidencia de la ejecución del registro legal en staging: el log del despliegue con tipo, versión y hash de cada documento, sin la ca

**Tasks agregadas:**

- S1: Localizar en server/src (Grep por accountRef, pseudonim, hmac) una función existente que derive el accountRef seudónimo y reutilizarla en el log de POST /legal/aceptaciones (server/src/legal/aceptacion.ts y routes/legal.ts). Solo si no existe, crear la derivación con HMAC-SHA256 y sal desde variable de entorno, sin valor por defecto en producción, y documentarla (docs/development/configuration.md). Informar en el cierre cuál de las dos vías se tomó. (valida: REQ-10, REQ-05; rollback: Revertir el commit de la derivación y del uso en el log; no afecta filas de aceptación.)
- S2: Leer .github/workflows/deploy-staging.yml, tomar el nombre exacto del secret o variable de MIGRATION_DATABASE_URL ya usado y referenciarlo en el paso `pnpm legal:registrar --autor pipeline`. Si el entorno del workflow no lo tiene configurado, detenerse y reportarlo como pendiente externo sin inventar nombres. (valida: REQ-11, REQ-01; rollback: Quitar el paso de registro del workflow deploy-staging.yml.)
- S1: Escribir la prueba automatizada del script de registro legal (pnpm legal:registrar) sobre una base de prueba: inserción con hash SHA-256, url_publicada informada, texto_snapshot nulo, idempotencia, versión previa intacta, hash distinto rechazado, y log con tipo, versión y hash sin la cadena de conexión. (valida: REQ-12, REQ-01, test; rollback: Eliminar el archivo de prueba agregado; no modifica código de producción.)
- S2: Ejecutar el despliegue de staging con el paso de registro y capturar el log (tipo, versión, hash) sin la cadena de conexión; adjuntar la evidencia en docs/development/release-runbook.md junto al ejemplo del log. Si no se puede ejecutar por configuración faltante, reportarlo como pendiente externo. (valida: REQ-13, REQ-08; rollback: Revertir la sección de evidencia del runbook; el registro en staging es append-only y no se borra.)

### Enmienda 2
**REQs:**

- REQ-02 (edit) `confirmed`: Una guarda de CI falla, nombrando el paso faltante, si el workflow deploy-staging.yml deja de invocar `legal:registrar --autor pipeline` o s
- REQ-18 (add) `confirmed`: Antes de implementar, el ejecutor confirma en el código del script `legal:registrar` si ya falla cuando el hash de docs/legal difiere del de
- REQ-19 (add) `confirmed`: Todos los comandos verify de las tasks de server usan el runner real del paquete server, tomado de server/package.json (scripts) y no invent
- REQ-20 (add) `confirmed`: El runbook docs/development/release-runbook.md documenta el paso `pnpm legal:registrar --autor pipeline` ahora ejecutado en el workflow de d

**Tasks agregadas:**

- S1: Confirmar en el script `legal:registrar` si ya compara el hash de docs/legal con el de app/assets/legal antes de insertar (REQ-03, REQ-18). Si ya existe, agregar o confirmar la prueba del caso de hash distinto. Si no existe, implementar la comparación para que aborte sin insertar y agregar la prueba. Usar el runner del server definido en server/package.json. (valida: REQ-03, REQ-18, REQ-19; rollback: Revertir el commit de la comparación de hash y de su prueba; no se tocan tablas ni filas registradas.)
- S2: Verificar el seed de capacidades del servidor para `documento_legal.aceptar` (REQ-14). Si ya figura como obligatoria, no modificar el seed. Si falta, detenerse y pedir la aprobación humana seed_rbac antes de agregarla. Después, confirmar con una prueba sobre la ruta real POST /legal/aceptaciones que una cuenta autenticada la pasa. (valida: REQ-07, REQ-14, REQ-19; rollback: Si se agregó la capacidad, revertir el cambio del seed y de su prueba tras la aprobación seed_rbac; sin cambios si ya existía.)

**Task ops:**

- edit S1.T1 { desc="Agregar en .github/workflows/deploy-staging.yml el paso que ejecuta `pnpm legal:registrar --autor pipeline`, escrito una sola vez (incluye el contenido que antes era S2.T4). Tomar para MIGRATION_DATABASE_URL el nombre exacto del secret o variable que ya existe en ese workflow; si el entorno no lo tiene configurado, detenerse y reportarlo como pendiente externo sin inventar nombres (REQ-11). El paso no imprime la cadena de conexión y deja en el log tipo, versión y hash.", validates=["REQ-01","REQ-11"] }
- delete S2.T4
- edit S1.T3 { desc="Implementar la guarda de CI que lee deploy-staging.yml y falla nombrando el paso faltante si no invoca `legal:registrar --autor pipeline`, o si el paso no define MIGRATION_DATABASE_URL con el nombre exacto del secret o variable existente del workflow (REQ-02, REQ-11). No imprime valores de secrets.", validates=["REQ-02","REQ-11"] }
- edit S1.T6 { desc="Escribir las pruebas de la guarda de CI: falla sin el paso `legal:registrar --autor pipeline`, falla sin MIGRATION_DATABASE_URL con el nombre de secret o variable existente, y pasa con ambos presentes (REQ-02, REQ-11).", validates=["REQ-02","REQ-11"], isTest=true }
- edit S1.T7 { desc="Buscar en server/src una función existente que derive el accountRef seudónimo y reutilizarla. Solo si no existe, crearla con HMAC-SHA256 y una sal tomada de variable de entorno, sin valor por defecto en producción (falla si falta la sal en producción), y documentarla (REQ-10). Esta task solo localiza o crea la derivación y NO la usa todavía: su uso en el log de aceptaciones queda en S2.T1.", validates=["REQ-10"] }
- edit S1.T4 { desc="En la app, abrir `urlPublicada` con url_launcher cuando la versión pedida desde V-51 no tiene texto empaquetado y hay conexión, reutilizando el mecanismo de conectividad que la app ya usa (sin agregar dependencia ni una verificación de red nueva). Sin conexión, mostrar el aviso de texto no disponible (REQ-04, REQ-17).", validates=["REQ-04","REQ-17"] }
- edit S2.T5 { desc="Ejecutar el despliegue real a staging y adjuntar la evidencia del registro (log con tipo, versión y hash, sin la cadena de conexión) en el runbook o en el ticket. Solo se corre tras la confirmación explícita del dev en el momento de ejecutarlo; sin esa confirmación, reportar la evidencia como pendiente (REQ-13, REQ-16). Si falta configuración del entorno, reportarlo como pendiente externo.", validates=["REQ-13","REQ-16"] }

### Enmienda 3
**REQs:**

- REQ-21 (add) `confirmed`: El runbook docs/development/release-runbook.md documenta el paso de registro legal (`pnpm legal:registrar --autor pipeline`) ejecutado en el

**Tasks agregadas:**

- S1: Escribir pruebas que validan REQ-04 y REQ-17: (a) prueba unitaria de la decisión de abrir `urlPublicada` cuando la versión pedida no tiene texto empaquetado y hay conexión, y de mostrar el aviso de texto no disponible sin conexión, usando el mecanismo de conectividad que la app ya utiliza (sin agregar dependencia ni verificación de red nueva); (b) prueba de widget con una versión sin empaquetar que verifica que se invoca `url_launcher` con la `urlPublicada` con conexión y que sin conexión se muestra el aviso. Ubicar el archivo de test bajo app/test junto a los tests existentes del documento legal (localizarlo con Glob antes de crear) y ajustar el verify a esa ruta concreta. (valida: REQ-04, REQ-17, test; rollback: Eliminar los archivos de test agregados bajo app/test; no altera código de producción.)

**Task ops:**

- edit S1.T5 { validates=["REQ-08","REQ-20"] }
- edit S2.T1 { desc="Localizar routes/legal.ts bajo server/src con Glob (sin crearlo en otra ubicación ni duplicar POST /legal/aceptaciones) y agregar el log del servidor por aceptación con accountRef seudónimo, tipo y versión, sin texto del documento ni cuerpo de la petición.", validates=["REQ-05","REQ-15"] }
- edit S1.T7 { desc="Buscar en server/src una función existente que derive el accountRef seudónimo; si existe, solo localizarla (sin usarla aquí). Si no existe, crearla con HMAC-SHA256 usando la variable de entorno ACCOUNT_REF_SALT (convención MAYUSCULAS_CON_GUION_BAJO), sin valor por defecto en production (falla al arrancar o al derivar si falta), con valor fijo solo en development y test, y documentarla en docs/development/configuration.md.", rollback="Revertir la función de derivación del accountRef y quitar ACCOUNT_REF_SALT de docs/development/configuration.md; si la función ya existía, no hay nada que revertir. No tocar aceptaciones registradas ni eventos append-only." }

**REQ ops:**

- remove REQ-20

### Enmienda 4
**REQs:**

- REQ-08 (edit) `confirmed`: docs/development/release-runbook.md indica que el registro legal ahora corre en el workflow de despliegue con `pnpm legal:registrar --autor 
- REQ-06 (edit) `inferred`: `aceptarOnline` genera una Idempotency-Key por intento de aceptación y la reutiliza en reintentos y toques repetidos del mismo intento. La p
- REQ-13 (edit) `confirmed`: Se deja evidencia de la ejecución del registro legal en staging: el log del despliegue con tipo, versión y hash de cada documento, sin la ca

**Task ops:**

- edit S1.T1 { verify=["pnpm --dir server test -- src/legal/guarda-workflow-legal.test.ts"] }
- edit S1.T3 { desc="Guarda de CI que falla nombrando el paso faltante si deploy-staging.yml deja de invocar `legal:registrar --autor pipeline` o de recibir MIGRATION_DATABASE_URL con el nombre exacto del secret existente. También revisa que docs/development/release-runbook.md mencione `legal:registrar --autor pipeline`. No imprime ni exige el valor del secret.", verify=["pnpm --dir server test -- src/legal/guarda-workflow-legal.test.ts"] }
- edit S1.T5 { validates=["REQ-08"] }
- edit S1.T6 { desc="Prueba de la guarda: el workflow sin el paso de registro (REQ-11) hace fallar la guarda nombrando el paso faltante; también falla si release-runbook.md no menciona `legal:registrar --autor pipeline`.", isTest=true, verify=["pnpm --dir server test -- src/legal/guarda-workflow-legal.test.ts"] }
- edit S1.T8 { desc="Confirmar en el código del script `legal:registrar` el comportamiento ante hash distinto: el hash distinto se compara contra la fila existente en base (misma tipo y versión) y el registro aborta antes de insertar, sin escribir ninguna fila, sin tocar versiones anteriores y sin imprimir la cadena de conexión. Si ya existe, solo se confirma o agrega la prueba; si no, se implementa." }
- edit S1.T10 { verify=["pnpm --dir server test -- src/legal/registrar-hash.test.ts"] }
- edit S2.T1 { desc="Localizar routes/legal.ts con Glob bajo server/src y modificar ese archivo para registrar cada aceptación en el log (accountRef, tipo y versión, sin texto ni cuerpo de la petición). Si el Glob no encuentra routes/legal.ts bajo server/src, detenerse y reportar; no crear el archivo ni duplicar la ruta POST /legal/aceptaciones.", verify=["pnpm --dir server test -- src/legal/aceptar-online.test.ts"] }
- edit S2.T3 { desc="Pruebas de idempotencia y regresión. Widget: el doble toque y el reintento usan UNA sola Idempotency-Key. Supertest (en esta task): dos POST con la misma clave dejan solo dos filas (una por documento). Incluye los casos de regresión QA-03a-10-01 (GET /v1/legal/documentos muestra términos y privacidad con su hash), QA-03a-10-05 (versión inexistente responde 404 sin detalles internos) y el caso edge de REQ-01 (registro idempotente sin tocar versiones anteriores).", validates=["REQ-06","REQ-01"], isTest=true, verify=["pnpm --dir server test -- src/legal/aceptar-online.test.ts"] }
- edit S2.T7 { verify=["pnpm --dir server test -- src/legal/aceptar-online.test.ts"] }

**REQ ops:**

- remove REQ-21

### Enmienda 5
**REQs:**

- REQ-13 (edit) `confirmed`: Se deja evidencia de la ejecución del registro legal en staging: el log del despliegue con tipo, versión y hash de cada documento, sin la ca

**Task ops:**

- edit S1.T8 { desc="Prueba automatizada del script de registro `pnpm legal:registrar` (REQ-12), en un archivo de test propio creado por esta task: server/src/legal/registrar-legal.test.ts. Cubre: inserción con hash_contenido igual al SHA-256 del Markdown, url_publicada no nula, texto_snapshot nulo, log con tipo, versión y hash sin la cadena de conexión, y hash distinto contra la fila existente de la misma versión (el registro falla y no modifica la fila). Solo prueba; no cambia el código del script.", rollback="Borrar server/src/legal/registrar-legal.test.ts. No toca el código del script, ni filas, ni versiones registradas.", validates=["REQ-12"], isTest=true, verify=["pnpm --dir server test -- src/legal/registrar-legal.test.ts"] }
- edit S1.T7 { verify=["pnpm --dir server test -- src/legal/account-ref.test.ts"] }
- edit S1.T1 { verify=[] }
- edit S1.T3 { verify=["pnpm --dir server test -- src/legal/guarda-workflow-registro.test.ts"] }
- edit S1.T10 { verify=["pnpm --dir server test -- src/legal/registrar-legal.test.ts","cd app && flutter test test/legal/empaquetado_test.dart"] }
- edit S2.T2 { verify=["cd app && flutter test test/legal/aceptar_online_idempotency_test.dart"] }
- edit S2.T3 { desc="Parte de widget del doble toque en `Aceptar y continuar`: la prueba verifica que el doble toque y el reintento del mismo intento usan UNA sola Idempotency-Key. No afirma dos filas: las dos filas (una por documento) las verifica el Supertest sobre la ruta real, en otra task.", rollback="Borrar app/test/legal/aceptar_continuar_doble_toque_test.dart. No toca código de la app ni filas registradas.", validates=["REQ-06"], isTest=true, verify=["cd app && flutter test test/legal/aceptar_continuar_doble_toque_test.dart"] }

### Enmienda 6
**REQs:**

- REQ-08 (edit) `confirmed`: docs/development/release-runbook.md, donde ya vive el paso de registro legal, indica que el registro legal ahora corre en el workflow de des
- REQ-09 (edit) `confirmed`: Reusar lo existente: el script `pnpm legal:registrar` (SHA-256, idempotente, sin texto_snapshot) y url_launcher ya presente; las tablas sigu
- REQ-13 (edit) `confirmed`: Se deja evidencia de la ejecución del registro legal en staging: el log del despliegue con tipo, versión y hash de cada documento, sin la ca

**REQ ops:**

- remove REQ-05
- remove REQ-06
- remove REQ-07
- remove REQ-10
- remove REQ-14
- remove REQ-15

### Enmienda 7
**REQs:**

- REQ-09 (edit) `confirmed`: Reusar lo existente: el script `pnpm legal:registrar` (SHA-256, idempotente, sin texto_snapshot) y url_launcher ya presente; las tablas sigu
- REQ-13 (edit) `confirmed`: Se deja evidencia de la ejecución del registro legal en staging: el log del despliegue con tipo, versión y hash de cada documento, sin la ca
- REQ-21 (add) `confirmed`: La guarda de CI del workflow de despliegue (paso `legal:registrar --autor pipeline` presente y con MIGRATION_DATABASE_URL, REQ-02 y REQ-11) 
- REQ-22 (add) `confirmed`: Una prueba de servidor cubre QA-03a-10-05: GET /legal/terminos/9.9 (versión inexistente) responde 404 sin exponer detalles internos (sin sta
- REQ-12 (edit) `confirmed`: Existe una prueba automatizada del script de registro (pnpm legal:registrar) que cubre REQ-01, REQ-03 y REQ-18: inserta con hash SHA-256 del

**Tasks agregadas:**

- S1: Prueba de servidor (isTest) para QA-03a-10-05 y el caso de versión sin exige_reaceptacion. Localizar con Glob la ruta real de routes/legal.ts bajo server/src (no crearla) y el patrón de test Supertest existente en server/src/legal/. Escribir server/src/legal/documento-version.test.ts con: (1) GET /legal/terminos/9.9 responde 404 sin stack trace, rutas ni detalles internos en el cuerpo; (2) una versión registrada sin exige_reaceptacion no exige nueva aceptación. Usar el runner real de server/package.json (REQ-19). (valida: REQ-22, test; rollback: Eliminar server/src/legal/documento-version.test.ts; no toca código de producción.)

**Task ops:**

- edit S1.T8 { desc="Prueba del script de registro `pnpm legal:registrar` (REQ-12): cubre inserción con hash_contenido igual al SHA-256 del Markdown, url_publicada informada y texto_snapshot nulo; log con tipo, versión y hash sin la cadena de conexión; hash distinto entre docs/legal y app/assets/legal (aborta sin escribir filas); idempotencia (segunda corrida no duplica ni modifica filas); y que no se tocan versiones anteriores. Usar el runner real de server/package.json y apuntar el verify solo al archivo de test que esta task escribe.", validates=["REQ-12","REQ-01","REQ-03","REQ-18"], isTest=true }
- edit S1.T3 { verify=["pnpm --dir server test -- src/legal/guarda-workflow-registro.test.ts"] }
- edit S1.T6 { validates=["REQ-02","REQ-11","REQ-21"], isTest=true, verify=["pnpm --dir server test -- src/legal/guarda-workflow-registro.test.ts"] }
- edit S2.T5 { desc="Evidencia del registro legal en staging (REQ-13, REQ-16). Solo con confirmación explícita del dev en el momento de correrlo, ejecutar el despliegue a staging y adjuntar en el runbook o en el ticket el log con tipo, versión y hash de cada documento, sin la cadena de conexión. QA-03a-10-01 (GET /v1/legal/documentos devuelve términos y privacidad con su hash) se valida con esa evidencia de staging; sin confirmación o sin configuración del entorno, la evidencia y QA-03a-10-01 quedan como pendiente externo y el gate lo declara así.", validates=["REQ-13","REQ-16"] }

### Enmienda 8
**REQs:**

- REQ-08 (edit) `confirmed`: docs/development/release-runbook.md, donde ya vive el paso de registro legal, indica que el registro legal ahora corre en el workflow de des
- REQ-09 (edit) `confirmed`: Reusar lo existente: el script `pnpm legal:registrar` (SHA-256, idempotente, sin texto_snapshot) y url_launcher ya presente; las tablas sigu
- REQ-12 (edit) `confirmed`: Existe una prueba automatizada del script de registro contra base, en su propio archivo server/src/legal/registrar-legal.test.ts, que cubre 
- REQ-03 (edit) `inferred`: Si el hash del texto empaquetado en app/assets/legal difiere del de la fuente docs/legal, el registro falla antes de insertar y el chequeo d
- REQ-22 (edit) `confirmed`: Una prueba de servidor cubre QA-03a-10-05: GET /legal/terminos/9.9 (versión inexistente) responde 404 sin exponer detalles internos (sin sta

**Task ops:**

- edit S1.T8 { desc="Prueba del script de registro contra base en server/src/legal/registrar-legal.test.ts (REQ-12): inserción con SHA-256, url_publicada y texto_snapshot nulo, log con tipo, versión y hash sin cadena de conexión, idempotencia, versión ya registrada con hash distinto (falla sin modificar la fila) y versiones anteriores intactas. No prueba la comparación docs/legal frente a app/assets/legal (eso es S1.T10, otro archivo). Incluye la regresión de REQ-09: server/src/test/legal/aceptar-online.test.ts y server/src/test/legal/migracion-legal.test.ts siguen en verde, y no hay rutas POST/PUT nuevas bajo /legal/documentos. El runner se toma de server/package.json (REQ-19).", validates=["REQ-01","REQ-09","REQ-12","REQ-18"], isTest=true, verify=["pnpm --filter server exec vitest run src/legal/registrar-legal.test.ts","pnpm --filter server exec vitest run src/test/legal/aceptar-online.test.ts","pnpm --filter server exec vitest run src/test/legal/migracion-legal.test.ts"] }
- edit S1.T10 { desc="Confirmar en el script legal:registrar si ya compara el hash de docs/legal con app/assets/legal antes de insertar; implementar solo si falta (REQ-18, REQ-03). Su prueba vive en su propio archivo server/src/legal/comparar-fuente-empaquetado.test.ts y solo cubre esa comparación (no idempotencia ni versión con hash distinto, que son de S1.T8). Documentar dónde se verifica (DEC-222). El runner se toma de server/package.json (REQ-19).", validates=["REQ-03","REQ-18"], verify=["pnpm --filter server exec vitest run src/legal/comparar-fuente-empaquetado.test.ts"] }

### Enmienda 9
**REQs:**

- REQ-11 (edit) `confirmed`: El paso de registro en deploy-staging.yml toma el nombre de MIGRATION_DATABASE_URL del secret o variable que ya existe en ese workflow, sin 
- REQ-09 (edit) `confirmed`: Reusar lo existente: el script `pnpm legal:registrar` (SHA-256, idempotente, sin texto_snapshot) y url_launcher ya presente; las tablas sigu
## Sessions

### Session 1 · T2 · open

**Tasks:**
- [ ] S1.T1
- [ ] S1.T3
- [ ] S1.T4
- [ ] S1.T5
- [ ] S1.T6
- [ ] S1.T8
- [ ] S1.T10
- [ ] S1.T11
- [ ] S1.T12

**Gate (auto)**: La guarda de CI falla con el fixture sin paso y pasa con el workflow real; legal:registrar falla con un asset alterado; la prueba de widget muestra launchUrl con conexión y el aviso sin conexión; el runbook documenta el paso.

### Session 2 · T1 · open

**Tasks:**
- [ ] S2.T5

**Gate (auto)**: La evidencia del registro en staging (una línea de log por documento con tipo, versión y hash SHA-256, sin cadena de conexión) queda adjunta, o la tarea figura como pendiente externo por falta de confirmación explícita del dev o de configuración del entorno. QA-03a-10-01 se valida con esa evidencia o queda pendiente junto con ella.

### Session 3 · T0 · open
