---
id: TAO-171-SPEC
project: taomangalam
ticket: TAO-171
status: approved
---

# HU-01-06 · Infraestructura de i18n por claves (ARB en la app + catálogo i18next en el servidor) con guardas de lint en CI

## Resumen ejecutivo

Se instala la infraestructura de i18n por claves en la app y en el servidor: ARB de español con clases de localización generadas, supportedLocales solo es y soporte de marcadores y plurales ICU; catálogo i18next en es para los errores, con resolución preferencia de la persona -> Accept-Language -> es (la preferencia de cuenta llega con EP-03b, así que hoy la resolución efectiva es Accept-Language + es); y dos guardas de CI (custom_lint en flutter-static, ESLint en backend-static) que rechazan textos fijos citando archivo y línea, más la convención de claves y la lista de términos no traducibles de DEC-049 versionadas junto al ARB. NO se hace: contenido del método (EP-02), plantillas de correo y portal (EP-03b/EP-16), publicación de otro idioma, ni UI de producto (el HomeScreen es provisional). Se sabe que funciona cuando: los widget tests renderizan textos y plurales 0/1/5 desde el ARB, un Text('Guardar') y un title literal hacen fallar los jobs, y un problem+json responde en español ante Accept-Language no soportado o ausente. Tamaño estimado: 5 puntos, 4 sesiones T2 (~9-11 h).

## Requirements

### REQ-01 `confirmed`
> Fuente: app/lib/app.dart:75

La app incorpora flutter_localizations e intl con un ARB de español (app/lib/l10n/app_es.arb), clases de localización generadas, supportedLocales con solo es, y soporte de marcadores y plurales ICU; todo texto visible y semántico de app/lib sale de claves del ARB.

### REQ-02 `confirmed`
> Fuente: server/src/middleware/error-handler.ts:26

El servidor resuelve el locale por preferencia de la persona, luego Accept-Language y por defecto es, y arma title y detail de cada problem+json de error desde un catálogo i18next en es; como solo es está publicado, todo locale no soportado cae a es.

### REQ-03 `confirmed`
> Fuente: app/analysis_options.yaml:21

Una regla de lint de la app basada en custom_lint rechaza literales de texto visibles o semánticos en app/lib, excepto código generado y pruebas, y corre dentro del job flutter-static fallando con archivo y línea.

### REQ-04 `confirmed`
> Fuente: server/eslint.config.mjs:15

Una regla de ESLint en el servidor rechaza textos literales en title y detail de respuestas de error, y corre dentro del job backend-static.

### REQ-05 `confirmed`
> Fuente: docs/product/decisiones/DEC-049-primera-version-solo-en-espanol.md:1

La convención de nombres de claves y la lista de términos que no se traducen de DEC-049 quedan documentadas y versionadas junto al ARB y al catálogo, como referencia para traducción, y los términos listados se conservan literales en el ARB.

### REQ-06 `confirmed` `enforcement`
> Fuente: server/src/dtos/error.ts:16

El catálogo del servidor usa el enum CodigoError y el clasificador existente (clasificarError/buildProblem) como fuente de claves, sin crear un mapeo de mensajes paralelo ni duplicar la lógica de errores.

### REQ-07 `confirmed` `enforcement`
> Fuente: .github/workflows/ci-pr.yml:202

La guarda de la app y la del servidor se integran como pasos dentro de los jobs existentes flutter-static y backend-static (y pnpm run static), sin crear jobs nuevos, y excluyen el código generado (build/**, widgetbook/**, src/generated/**, contract/generated/**).

### REQ-08 `confirmed` `enforcement`
> Fuente: server/src/middleware/error-handler.ts:128

Los mensajes del catálogo no incluyen datos personales ni stack traces, y los logs del servidor registran el código de error, no el texto traducido.
## Tasks

#### S1.T1 — Agregar flutter_localizations (sdk) e intl a app/pubspec.yaml, crear app/l10n.yaml (app_es.arb como plantilla, salida de AppLocalizations en app/lib/l10n) y regenerar el lockfile.
Contrato: rollback: Revertir app/pubspec.yaml y app/pubspec.lock y borrar app/l10n.yaml; correr flutter pub get.. Status: done

#### S1.T2 — Crear app/lib/l10n/app_es.arb con las claves del texto provisional (título de la barra y mensaje del HomeScreen), una clave con plural ICU (p. ej. diasRestantes) y una con marcador ICU.
Contrato: rollback: Borrar app/lib/l10n/app_es.arb y el Dart generado.. Status: done

#### S1.T3 — Configurar MaterialApp en app/lib/app.dart con localizationsDelegates, supportedLocales=[Locale('es')] y locale es; reemplazar los literales visibles de app/lib/features/home/presentation/home_screen.dart (appTitle y el mensaje del placeholder) por claves del ARB.
Contrato: rollback: Revertir app/lib/app.dart y home_screen.dart a los literales y constantes previos.. Status: done

#### S1.T4 — Documentar la convención de nombres de claves y versionar la lista de términos no traducibles de DEC-049 junto al ARB (app/lib/l10n/README.md), referenciando DEC-166 y DEC-049.
Contrato: rollback: Borrar app/lib/l10n/README.md.. Status: done

#### S1.T5 — Widget/unit tests: render con Locale('es') tomando el texto del ARB; plural 0/1/5 coincide con el ARB; marcador ICU interpola; una clave ausente en el ARB rompe la compilación; coherencia ARB<->lista de no traducibles.
Contrato: rollback: Quitar los tests agregados en app/test.. Status: done

#### S2.T1 — Crear el paquete de custom_lint de la app con una regla que rechaza literales de texto en posiciones visibles o semánticas (Text, Tooltip, Semantics.label, etc.) en app/lib, excluyendo código generado y tests, reportando archivo y línea.
Contrato: rollback: Eliminar el paquete de lint y su entrada en pubspec/analysis_options.. Status: done

#### S2.T2 — Declarar el plugin en app/pubspec.yaml (dev_dependencies) para que custom_lint lo descubra, ajustar app/analysis_options.yaml si hace falta y agregar el paso de la guarda dentro del job flutter-static existente en .github/workflows/ci-pr.yml.
Contrato: rollback: Revertir app/pubspec.yaml, app/analysis_options.yaml y .github/workflows/ci-pr.yml.. Status: done

#### S2.T3 — Tests de la regla de lint: marca Text('Guardar') y etiquetas semánticas o tooltips literales; no marca el ARB generado ni los tests; el app/lib existente pasa.
Contrato: rollback: Quitar los tests de la regla.. Status: done

#### S3.T1 — Agregar i18next al servidor y crear el catálogo es en server/src/i18n/ con una entrada por CodigoError del contrato (title y detail por defecto).
Contrato: rollback: Quitar server/src/i18n y la dependencia i18next.. Status: done

#### S3.T2 — Implementar la resolución de locale en el servidor: preferencia de la persona (vacía en esta entrega; llega con EP-03b) -> Accept-Language -> es, con es como único idioma publicado.
Contrato: rollback: Quitar el módulo de resolución de locale.. Status: done

#### S3.T3 — Reemplazar los literales de server/src/middleware/error-handler.ts (TITULO_POR_CODIGO, tituloPorDefecto, recurso_no_encontrado/error_interno) por lecturas del catálogo, conservando el logueo por codigo y el contrato Problem.
Contrato: rollback: Revertir server/src/middleware/error-handler.ts a los literales previos.. Status: done

#### S3.T4 — Tests: resolución de locale (orden y fallback a es); problem+json en español con Accept-Language en-US y fr; clave faltante falla nombrando la clave; 500 error_interno sin stack; el log conserva codigo y requestId.
Contrato: rollback: Quitar los tests agregados en server/src.. Status: done

#### S4.T1 — Agregar en server/eslint.config.mjs una regla que rechaza literales de texto en title y detail de respuestas de error y dejarla activa en pnpm run static.
Contrato: rollback: Revertir server/eslint.config.mjs.. Status: done

#### S4.T2 — Tests de la regla ESLint: marca title y detail literales, permite el acceso al catálogo y las claves estáticas, y el código actual pasa.
Contrato: rollback: Quitar los tests de la regla ESLint.. Status: done

#### S4.T3 — Regresión integral: flutter-static y flutter-test (app) y static y test (server) verdes; ARB, catálogo y lista de no traducibles coherentes; sin regresión de server/src/middleware/error-handler.test.ts ni server/src/app.test.ts.
Contrato: rollback: No aplica (verificación).. Status: done

#### S5.T1 — Ampliar la regla no_hardcoded_ui_text del paquete app/custom_lint para que detecte literales de texto pasados a widgets propios del proyecto, no solo a la lista fija de widgets de Flutter. La deteccion debe basarse en el tipo resuelto del constructor invocado (subclase de Widget) mas los nombres de parametros textuales, de modo que marque casos como _MutedText('...'), _ValueText('...'), _PanelCard(title: '...') y _PlaceholderLine(label: '...')/_PlaceholderLine(note: '...'). No debe marcar valores no visibles: rutas de assets, claves/keys, tags, nombres de familia de fuente y demas valores tecnicos. Mantener las exclusiones vigentes de codigo generado y pruebas. Incluir tests del propio paquete de lint que cubran un widget propio con literal visible (marcado) y un valor tecnico (no marcado).
Contrato: rollback: Revertir el paquete app/custom_lint (regla y tests) a la version previa al cambio; la regla vuelve a marcar solo los widgets de Flutter de la lista fija.. Status: done

#### S5.T2 — Migrar al ARB app/lib/l10n/app_es.arb todos los literales visibles que la regla ampliada (S5.T1) senale en app/lib, incluidos los que hoy se pasan a widgets propios: titulos de seccion ('Sabor', 'Endpoint', 'Version de la app', 'Conectividad', 'Salud del backend', 'Simulacion (development)', 'Pendientes'); etiquetas y notas de placeholders ('Sync', 'Outbox', 'Version del contenido', 'Reloj', 'Pendiente (EP-06) — sin datos aun', 'Pendiente (EP-02) — sin datos aun', 'Pendiente — sin datos aun'); estados ('Cargando...', 'No disponible', 'Consultando...', 'Sin estado', 'Sin chequeos'); y los dos subtitulos del panel ('Rechaza la peticion sin llegar al servidor', 'Rechaza como un error del servidor, sin llegar a el'). Conservar los textos visibles exactos, usar la convencion de nombres de claves vigente, regenerar las clases de localizacion y ajustar los tests de pantalla solo si fuera necesario, sin aflojar aserciones.
Contrato: rollback: Revertir app/lib/l10n/app_es.arb, el panel y las pantallas tocadas y los archivos generados de localizacion al estado previo, dejando los textos como literales en el codigo.. Status: done

#### S5.T3 — Acotar la regla de ESLint de server/eslint.config.mjs para que solo marque title/detail literales en objetos de respuesta de error del contrato (por ejemplo, objetos que tambien declaran codigo), de modo que un objeto de dominio o un DTO ajeno con un title literal no se marque. Actualizar server/src/static-gate.test.ts: los fixtures positivos pasan a ser objetos con forma de respuesta de error (incluyendo codigo) y se agrega un caso negativo de objeto de dominio con title literal que no debe marcarse.
Contrato: rollback: Revertir server/eslint.config.mjs y server/src/static-gate.test.ts al estado previo; la regla vuelve a marcar cualquier title/detail literal.. Status: done

#### S5.T4 — Documentar en server/src/i18n/README.md, junto al catalogo del servidor, la convencion de claves errors.<codigo>.<campo> y la politica de terminos no traducibles. Limpiar los ids internos de proceso de los documentos que agrego este ticket: app/lib/l10n/README.md, app/lib/l10n/terminos_no_traducibles.txt y la descripcion del ARB que los mencione, reemplazandolos por una descripcion en texto o por la referencia externa GH-49, sin tokens tipo REQ-, DEC- ni equivalentes.
Contrato: rollback: Revertir server/src/i18n/README.md, app/lib/l10n/README.md, app/lib/l10n/terminos_no_traducibles.txt y la descripcion del ARB al estado previo.. Status: done

#### S5.T5 — Verificacion final de la sesion, sin cambios de codigo: correr la regresion de la app (analyze estricto, custom_lint, flutter test) y la del servidor (static, test); confirmar que app/lib queda limpio bajo la regla ampliada y que el ARB, el catalogo i18next del servidor y la lista de terminos no traducibles son coherentes entre si (sin claves usadas que falten, sin terminos listados traducidos). Reportar la evidencia de cada corrida.
Contrato: rollback: No aplica: la tarea solo verifica y no modifica archivos.. Status: done
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4
- [x] S1.T5

**Gate (auto)**: La app corre en es: el título de la barra y el mensaje del HomeScreen salen de app_es.arb, un widget test con Locale('es') muestra el plural en 0, 1 y 5 y un marcador ICU interpolado, una clave ausente rompe la compilación, y la convención de claves + lista DEC-049 quedan versionadas junto al ARB.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2
- [x] S2.T3

**Gate (auto)**: Correr flutter-static (o dart run custom_lint local) rechaza un Text('Guardar') en app/lib citando archivo y línea y el app/lib limpio pasa; la guarda corre como paso dentro del job flutter-static existente, sin job nuevo.

### Session 3 · T2 · continue

**Tasks:**
- [x] S3.T1
- [x] S3.T2
- [x] S3.T3
- [x] S3.T4

**Gate (auto)**: Un endpoint que falla devuelve problem+json con title y detail en español tomados del catálogo i18next sin importar Accept-Language (en-US y fr caen a es), una prueba falla nombrando la clave faltante y el log conserva codigo y requestId sin el texto traducido.

### Session 4 · T2 · continue

**Tasks:**
- [x] S4.T1
- [x] S4.T2
- [x] S4.T3

**Gate (auto)**: backend-static rechaza un title o detail literal en una respuesta de error y el servidor limpio pasa; la regresión de app y servidor queda verde y ARB, catálogo y lista de no traducibles quedan coherentes.

### Session 5 · T2 · continue

**Tasks:**
- [x] S5.T1
- [x] S5.T2
- [x] S5.T3
- [x] S5.T4
- [x] S5.T5

**Gate (auto)**: La regla ampliada rechaza un literal de texto pasado a un widget propio (p. ej. _MutedText('Guardar')) citando archivo y línea, y app/lib limpio pasa; backend-static rechaza un title/detail literal de una respuesta de error y no marca un objeto de dominio con title; la regresión de app y servidor queda verde y los docs del catálogo y de términos no traducibles quedan sin ids internos de proceso.
## Enmiendas (refine_spec)

### Enmienda 1

**Tasks agregadas:**

- S5: Ampliar la regla no_hardcoded_ui_text del paquete app/custom_lint para que detecte literales de texto pasados a widgets propios del proyecto, no solo a la lista fija de widgets de Flutter. La deteccion debe basarse en el tipo resuelto del constructor invocado (subclase de Widget) mas los nombres de parametros textuales, de modo que marque casos como _MutedText('...'), _ValueText('...'), _PanelCard(title: '...') y _PlaceholderLine(label: '...')/_PlaceholderLine(note: '...'). No debe marcar valores no visibles: rutas de assets, claves/keys, tags, nombres de familia de fuente y demas valores tecnicos. Mantener las exclusiones vigentes de codigo generado y pruebas. Incluir tests del propio paquete de lint que cubran un widget propio con literal visible (marcado) y un valor tecnico (no marcado). (valida: REQ-03, REQ-07; rollback: Revertir el paquete app/custom_lint (regla y tests) a la version previa al cambio; la regla vuelve a marcar solo los widgets de Flutter de la lista fija.)
- S5: Migrar al ARB app/lib/l10n/app_es.arb todos los literales visibles que la regla ampliada (S5.T1) senale en app/lib, incluidos los que hoy se pasan a widgets propios: titulos de seccion ('Sabor', 'Endpoint', 'Version de la app', 'Conectividad', 'Salud del backend', 'Simulacion (development)', 'Pendientes'); etiquetas y notas de placeholders ('Sync', 'Outbox', 'Version del contenido', 'Reloj', 'Pendiente (EP-06) — sin datos aun', 'Pendiente (EP-02) — sin datos aun', 'Pendiente — sin datos aun'); estados ('Cargando...', 'No disponible', 'Consultando...', 'Sin estado', 'Sin chequeos'); y los dos subtitulos del panel ('Rechaza la peticion sin llegar al servidor', 'Rechaza como un error del servidor, sin llegar a el'). Conservar los textos visibles exactos, usar la convencion de nombres de claves vigente, regenerar las clases de localizacion y ajustar los tests de pantalla solo si fuera necesario, sin aflojar aserciones. (valida: REQ-01, REQ-03; rollback: Revertir app/lib/l10n/app_es.arb, el panel y las pantallas tocadas y los archivos generados de localizacion al estado previo, dejando los textos como literales en el codigo.)
- S5: Acotar la regla de ESLint de server/eslint.config.mjs para que solo marque title/detail literales en objetos de respuesta de error del contrato (por ejemplo, objetos que tambien declaran codigo), de modo que un objeto de dominio o un DTO ajeno con un title literal no se marque. Actualizar server/src/static-gate.test.ts: los fixtures positivos pasan a ser objetos con forma de respuesta de error (incluyendo codigo) y se agrega un caso negativo de objeto de dominio con title literal que no debe marcarse. (valida: REQ-04, REQ-06, REQ-07; rollback: Revertir server/eslint.config.mjs y server/src/static-gate.test.ts al estado previo; la regla vuelve a marcar cualquier title/detail literal.)
- S5: Documentar en server/src/i18n/README.md, junto al catalogo del servidor, la convencion de claves errors.<codigo>.<campo> y la politica de terminos no traducibles. Limpiar los ids internos de proceso de los documentos que agrego este ticket: app/lib/l10n/README.md, app/lib/l10n/terminos_no_traducibles.txt y la descripcion del ARB que los mencione, reemplazandolos por una descripcion en texto o por la referencia externa GH-49, sin tokens tipo REQ-, DEC- ni equivalentes. (valida: REQ-05; rollback: Revertir server/src/i18n/README.md, app/lib/l10n/README.md, app/lib/l10n/terminos_no_traducibles.txt y la descripcion del ARB al estado previo.)
- S5: Verificacion final de la sesion, sin cambios de codigo: correr la regresion de la app (analyze estricto, custom_lint, flutter test) y la del servidor (static, test); confirmar que app/lib queda limpio bajo la regla ampliada y que el ARB, el catalogo i18next del servidor y la lista de terminos no traducibles son coherentes entre si (sin claves usadas que falten, sin terminos listados traducidos). Reportar la evidencia de cada corrida. (valida: REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, REQ-07, test; rollback: No aplica: la tarea solo verifica y no modifica archivos.)

