---
id: TAO-212-SPEC
project: taomangalam
ticket: TAO-212
status: approved
---

# TAO-212 · HU-02-16 Derivado de referencia del contenido (resultados) en server/resources/ con verificación de vigencia y paridad en CI

## Resumen ejecutivo

Qué se hace: un script TypeScript (server/scripts/generar-recurso-contenido.ts, ejecutado con tsx, con el mismo patrón que server/scripts/sincronizar-legal.ts) genera de forma determinista server/resources/contenido-referencia.v1.json a partir de docs/content/catalogos/resultados.v1.json. Conserva content_key, content_version (catalogVersion), textos, sourceRefs y resoluciones editoriales. Además: un modo --check que nombra el catálogo desactualizado y compara claves y versiones con app/assets/catalogos/resultados.v1.json, un módulo de server/src/ que lee el recurso desde el Root Directory de server/, la copia de resources/ en el Dockerfile, un paso en un job de ci-pr.yml que ya verifica server/ y la documentación en docs/development/commands.md.
Qué NO se hace: endpoints de consulta, otros catálogos (casas, ritual_sesion, signos_personalidades), edición de docs/content/, generador Python, lectura de docs/ o app/ en runtime o en el build de la imagen, cambios de Prisma ni de la DB.
Cómo se sabe que funciona: recurso:contenido corrido dos veces no deja diff en git. recurso:contenido:check falla nombrando resultados.v1.json si la fuente cambia sin regenerar, y nombra la clave y las dos versiones si hay discrepancia con la app. Las pruebas de vitest leen el recurso desde server/. El listado de la imagen muestra resources/ y no tiene DOCX, imágenes maestras ni docs/. markdownlint pasa sobre commands.md.
Tamaño: 2 puntos, 2 sesiones (T2 + T1), riesgo bajo.
ADVERTENCIA: la paridad con app/ lee una ruta fuera de server/. Se limita al modo --check y a las pruebas en CI, nunca al runtime ni al build de la imagen (DEC-205).

Datos a confirmar antes de ejecutar:
- Nombre exacto del campo de resoluciones editoriales y de sourceRefs dentro de docs/content/catalogos/resultados.v1.json (confirmar leyendo el catálogo y su JSON Schema de TAO-198).
- Ruta y convención de capas del módulo lector en server/src/, y carpeta de los tests de vitest en server/ (confirmar en la estructura actual de server/src/ y en la config de vitest).
- Job de ci-pr.yml que ya compila o verifica server/, donde se agrega el paso recurso:contenido:check (confirmar en .github/workflows/ci-pr.yml; el job docs de las líneas 1175-1204 corre los --check de Python y no es de server/).
- Etapa del server/Dockerfile donde hoy se copia legal/, para copiar resources/ en la misma etapa (confirmar en server/Dockerfile y en server/.dockerignore).

## Requirements

### REQ-01 `confirmed`
> Fuente: Adenda 1 (salida determinista) y hallazgo del juez 1

El generador produce server/resources/contenido-referencia.v1.json a partir de docs/content/catalogos/resultados.v1.json, y conserva content_key, content_version (catalogVersion), textos, sourceRefs y resoluciones editoriales de cada entrada. La salida es determinista: dos corridas sin cambios en la fuente producen bytes idénticos. Si el catálogo fuente no existe o no es JSON válido, el script termina con código distinto de 0 nombrando el catálogo y NO escribe un derivado parcial: arma el resultado completo en memoria y lo escribe al final (escritura atómica), dejando intacto el derivado previo.

### REQ-02 `confirmed`
> Fuente: ci-pr.yml: job que compila o verifica server/ (no el job docs); Adenda 1 y hallazgo del juez 6

recurso:contenido:check (script --check) falla con código distinto de 0 y nombra el catálogo o recurso desactualizado cuando la fuente cambió y el derivado no se regeneró. El paso está registrado en el job de ci-pr.yml que ya compila o verifica server/ (no en el job docs), sin quitar ni alterar pasos existentes. Ese job hace checkout de docs/ y app/ (necesarios para la fuente y la paridad), y el comando exacto del paso se ejecuta con éxito en local desde la raíz del repo antes de cerrar.

### REQ-03 `confirmed`
> Fuente: Adenda 1 (lectura en runtime, empaquetado) y hallazgo del juez 2; DEC-205

Un módulo de server/src/ lee server/resources/contenido-referencia.v1.json resolviendo la ruta desde la ubicación del propio módulo (import.meta.url) hacia la carpeta resources/ del Root Directory de server/, sin acceder a docs/, app/ ni rutas fuera de server/. Funciona tanto ejecutado desde src/ como desde el código compilado en dist/ (confirmado contra el WORKDIR y CMD de server/Dockerfile). El server/Dockerfile copia resources/ igual que legal/, y la imagen no contiene DOCX, maestros de imagen ni documentos de docs/ (DEC-205).

### REQ-04 `confirmed`
> Fuente: Adenda 1 (paridad con la app) y hallazgo del juez 3; esquema de TAO-198

La verificación de paridad compara por content_key el derivado contra app/assets/catalogos/resultados.v1.json y falla nombrando la clave y ambas versiones. La versión de cada entrada se define así: si catalogVersion está a nivel de catálogo, todas las entradas heredan el catalogVersion de su catálogo (leído del catálogo y de su JSON Schema de TAO-198, y registrado en la task); content_version por entrada solo se usa si el schema lo define. Lee app/ solo en el modo --check y en las pruebas, nunca en runtime ni en el build de la imagen.

### REQ-05 `inferred` `enforcement`
> Fuente: taomangalam/server/scripts/sincronizar-legal.ts

El script sigue el precedente de server/scripts/sincronizar-legal.ts: es TypeScript ejecutado con tsx, idempotente y con mensajes de error seguros. Declara como constante la lista de catálogos incluidos (hoy solo resultados), reutiliza los catálogos ya generados por HU-02-04 sin agregar un generador Python y no edita docs/content/catalogos/ ni las fuentes editoriales.

### REQ-06 `confirmed` `variant`
> Fuente: sonda:card-docs-de-superficie-6c8ae176a6

docs/development/commands.md documenta recurso:contenido y recurso:contenido:check junto a los demás comandos del repo: uso, parámetros (--check), qué catálogo procesa y un ejemplo de salida cuando el derivado está desactualizado.

### REQ-07 `confirmed` `variant`
> Fuente: sonda:card-lint-de-docs-4d9deffd06

docs/development/commands.md está en .docs-baseline.txt. Después de la modificación pasa markdownlint-cli2 sin errores, para que el job docs y quality-gate no queden en rojo. Los catálogos de docs/content/catalogos/ y las fuentes editoriales no se editan.

### REQ-08 `confirmed`
> Fuente: Hallazgo del juez 5; QA-02-16-05; DEC-205

La evidencia de QA-02-16-05 es el listado real del contenido de la imagen construida (docker build de server/ y listado de /app/resources y /app). Si Docker no está disponible en la sesión, la evidencia se reporta como no ejecutada, nunca como pasada.
## Tasks

#### S1.T1 — Crear server/scripts/generar-recurso-contenido.ts (tsx) con el patrón de server/scripts/sincronizar-legal.ts. Declara una constante CATALOGOS_INCLUIDOS = ['resultados'], lee docs/content/catalogos/resultados.v1.json, conserva content_key, content_version (catalogVersion), textos, sourceRefs y resoluciones editoriales, serializa con orden de claves estable y salto de línea final, y escribe server/resources/contenido-referencia.v1.json. Agregar a server/package.json los scripts recurso:contenido y recurso:contenido:check (este último pasa --check). Commitear el derivado generado. No editar docs/content/catalogos/.
Contrato: rollback: Borrar server/scripts/generar-recurso-contenido.ts, server/resources/contenido-referencia.v1.json y los dos scripts de server/package.json (git revert del commit).. Status: pending

#### S1.T2 — Implementar el modo --check en generar-recurso-contenido.ts. Regenera en memoria y compara con server/resources/contenido-referencia.v1.json sin escribir. Si difiere o falta, sale con código 1 y un mensaje seguro (sin stack trace) que nombra el catálogo (resultados.v1.json) y el recurso desactualizado.
Contrato: rollback: Revertir la rama --check del script; recurso:contenido queda solo como generador.. Status: pending

#### S1.T3 — Crear en server/src/ un módulo lector del contenido de referencia, con el mismo estilo de capas que el resto de server/src/. Resuelve server/resources/contenido-referencia.v1.json de forma relativa al Root Directory de server/ (sin '..' hacia docs/ o app/), lo parsea y expone la búsqueda por content_key con su content_version. Si el archivo falta, falla con un mensaje seguro.
Contrato: rollback: Borrar el módulo lector; ningún consumidor lo usa todavía en este ticket.. Status: pending

#### S1.T4 — Agregar en server/Dockerfile la copia explícita de resources/ en la misma etapa donde hoy se copia legal/ (las copias actuales son src, contract, prisma y legal). Verificar que server/.dockerignore no excluye resources/. No copiar nada de docs/ ni app/.
Contrato: rollback: Quitar la línea COPY de resources/ del server/Dockerfile y cualquier cambio en server/.dockerignore.. Status: pending

#### S1.T5 — Tests de vitest en server/: (a) determinismo: dos generaciones dan bytes iguales; (b) conservación de content_key, content_version, textos, sourceRefs y resoluciones contra la fuente; (c) solo se incluye resultados; (d) --check falla con un fixture alterado y con el recurso ausente, nombrando resultados.v1.json; (e) el lector devuelve una clave conocida desde server/ y su path resuelto queda dentro de server/; (f) el contenido del paquete: server/resources/ no tiene .docx ni imágenes maestras, y el Dockerfile copia resources/ y no copia docs/ ni app/. Usar fixtures temporales, sin tocar docs/content/catalogos/.
Contrato: rollback: Borrar los archivos de test agregados.. Status: pending

#### S1.T6 — Ajuste S1.T1 (hallazgo 1): en server/scripts/generar-recurso-contenido.ts, si docs/content/catalogos/resultados.v1.json no existe o no es JSON válido, terminar con process.exit distinto de 0 con mensaje seguro que nombre el catálogo. Armar el derivado completo en memoria y escribirlo al final en una sola operación (escritura atómica: archivo temporal en server/resources/ y rename), sin dejar derivado parcial ni tocar el previo ante error. Agregar a S1.T5 el caso (g): fixture con catálogo ausente y fixture con catálogo JSON inválido, ambos verificando código distinto de 0, nombre del catálogo y derivado previo intacto.
Contrato: rollback: Revertir los cambios del script y del caso (g) con git checkout sobre server/scripts/generar-recurso-contenido.ts y su archivo de test.. Status: pending

#### S1.T7 — Ajuste S1.T3 (hallazgo 2): el módulo lector de server/src/ resuelve la ruta con import.meta.url hacia la carpeta resources/ del Root Directory de server/, válida desde src/ y desde dist/. Al implementar, confirmar contra el WORKDIR y CMD de server/Dockerfile que la ruta relativa resultante existe en la imagen y registrar la verificación en la task. Agregar un test que lea el recurso desde src/ y otro que, tras pnpm build, lea el recurso desde el módulo compilado en dist/ y compare claves y versiones.
Contrato: rollback: Revertir el módulo lector y sus tests con git checkout; el Dockerfile no se altera en esta task.. Status: pending

#### S1.T8 — Evidencia de QA-02-16-05 (REQ-08): construir la imagen de server/ y listar su contenido real. Comandos exactos, ejecutados desde la raíz del repo: (1) 'docker build -t tao-server:ep02-check server/'; (2) 'docker run --rm --entrypoint ls tao-server:ep02-check -R /app/resources'; (3) 'docker run --rm --entrypoint ls tao-server:ep02-check -a /app'. Confirmar que /app/resources contiene solo contenido-referencia.v1.json y que /app no contiene DOCX, maestros de imagen ni documentos de docs/. Adjuntar los listados como evidencia. Si Docker no está disponible en la sesión, reportar la evidencia como no ejecutada, nunca como pasada.
Contrato: rollback: Eliminar la imagen de prueba con 'docker rmi tao-server:ep02-check'. No hay cambios en archivos del repo que revertir.. Status: pending

#### S2.T1 — Verificación de paridad (REQ-04): comparar por content_key el derivado server/resources/contenido-referencia.v1.json contra app/assets/catalogos/resultados.v1.json. Cuando una clave falte o la versión difiera, el mensaje de error usa el formato literal 'CONTENT_KEY: app=A servidor=B', donde CONTENT_KEY es la content_key real de la entrada, A es la versión del lado app y B es la versión del lado servidor. Ejemplo concreto: 'resultado.ejemplo: app=1.0.0 servidor=1.1.0'. La versión de cada entrada es el catalogVersion de su catálogo, salvo que el JSON Schema de TAO-198 defina content_version por entrada. Leer app/ solo en el modo --check y en las pruebas de vitest, nunca en runtime ni en el build de la imagen. Las pruebas deben afirmar el texto exacto del mensaje con el ejemplo 'resultado.ejemplo: app=1.0.0 servidor=1.1.0'.
Contrato: rollback: Revertir los cambios de la task en el script y en sus pruebas con git (git checkout de esos archivos); el derivado y los catálogos no se tocan.. Status: pending

#### S2.T2 — Registrar 'pnpm -C server run recurso:contenido:check' como un paso nuevo en el job de .github/workflows/ci-pr.yml que ya compila o verifica server/. Sin quitar ni alterar los pasos existentes, y sin tocar el job docs (líneas 1175-1204 con build_result_catalog.py --check).
Contrato: rollback: Quitar el paso agregado de ci-pr.yml.. Status: pending

#### S2.T3 — Documentar en docs/development/commands.md los comandos recurso:contenido y recurso:contenido:check. Incluir para qué sirven, qué catálogo procesan (resultados.v1.json, según la constante CATALOGOS_INCLUIDOS), dónde escriben (server/resources/contenido-referencia.v1.json), la verificación de paridad con app/ y un ejemplo de salida con el derivado desactualizado. El archivo está en .docs-baseline.txt y debe quedar compliant con markdownlint-cli2.
Contrato: rollback: Revertir la sección agregada en docs/development/commands.md.. Status: pending

#### S2.T4 — Tests de vitest de paridad: igualdad sin diferencias, versión distinta (mensaje con la clave, 1.0.0 y 1.1.0) y clave faltante de cada lado, con fixtures temporales. Agregar una prueba que confirme que server/src/ no referencia app/ ni docs/. Correr markdownlint sobre commands.md como evidencia de REQ-06 y REQ-07.
Contrato: rollback: Borrar los tests de paridad agregados.. Status: pending

#### S2.T5 — Ajuste S2.T1 (hallazgo 3): antes de implementar la paridad, leer en docs/content/catalogos/resultados.v1.json y en su JSON Schema de TAO-198 dónde vive catalogVersion. Si es a nivel de catálogo, comparar por content_key y usar el catalogVersion del catálogo para todas sus entradas (app y derivado); si el schema define versión por entrada, usarla. Registrar en la descripción de la task la ubicación exacta del campo encontrada. El error nombra la clave y ambas versiones.
Contrato: rollback: Revertir la lógica de paridad y sus tests con git checkout sobre server/scripts/generar-recurso-contenido.ts y su test.. Status: pending

#### S2.T6 — Ajuste S2.T2 (hallazgos 4 y 6): registrar el paso recurso:contenido:check en el job de ci-pr.yml que compila o verifica server/ (no en el job docs) y apuntar el sourceRef de REQ-02 a ese job. Además del git diff, correr localmente desde la raíz del repo el comando exacto del paso de CI (recurso:contenido:check, con el mismo --dir/--filter que use el workflow) y verificar que sale en 0. Confirmar que el job elegido hace checkout de docs/ y app/ (sin sparse-checkout que los excluya). Si el repo usa actionlint, validarlo sobre .github/workflows/ci-pr.yml. Confirmar con git diff que no se quitaron ni alteraron pasos existentes.
Contrato: rollback: Revertir .github/workflows/ci-pr.yml con git checkout.. Status: pending
## Cambios al modelo de datos

Ninguno.

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-01 (edit) `confirmed`: El generador produce server/resources/contenido-referencia.v1.json a partir de docs/content/catalogos/resultados.v1.json, y conserva content
- REQ-02 (edit) `confirmed`: recurso:contenido:check (script --check) falla con código distinto de 0 y nombra el catálogo o recurso desactualizado cuando la fuente cambi
- REQ-03 (edit) `confirmed`: Un módulo de server/src/ lee server/resources/contenido-referencia.v1.json resolviendo la ruta desde la ubicación del propio módulo (import.
- REQ-04 (edit) `confirmed`: La verificación de paridad compara por content_key el derivado contra app/assets/catalogos/resultados.v1.json y falla nombrando la clave y a
- REQ-08 (add) `confirmed`: La evidencia de QA-02-16-05 es el listado real del contenido de la imagen construida (docker build de server/ y listado de /app/resources y 

**Tasks agregadas:**

- S1: Ajuste S1.T1 (hallazgo 1): en server/scripts/generar-recurso-contenido.ts, si docs/content/catalogos/resultados.v1.json no existe o no es JSON válido, terminar con process.exit distinto de 0 con mensaje seguro que nombre el catálogo. Armar el derivado completo en memoria y escribirlo al final en una sola operación (escritura atómica: archivo temporal en server/resources/ y rename), sin dejar derivado parcial ni tocar el previo ante error. Agregar a S1.T5 el caso (g): fixture con catálogo ausente y fixture con catálogo JSON inválido, ambos verificando código distinto de 0, nombre del catálogo y derivado previo intacto. (valida: REQ-01; rollback: Revertir los cambios del script y del caso (g) con git checkout sobre server/scripts/generar-recurso-contenido.ts y su archivo de test.)
- S1: Ajuste S1.T3 (hallazgo 2): el módulo lector de server/src/ resuelve la ruta con import.meta.url hacia la carpeta resources/ del Root Directory de server/, válida desde src/ y desde dist/. Al implementar, confirmar contra el WORKDIR y CMD de server/Dockerfile que la ruta relativa resultante existe en la imagen y registrar la verificación en la task. Agregar un test que lea el recurso desde src/ y otro que, tras pnpm build, lea el recurso desde el módulo compilado en dist/ y compare claves y versiones. (valida: REQ-03; rollback: Revertir el módulo lector y sus tests con git checkout; el Dockerfile no se altera en esta task.)
- S1: Ajuste S1.T4 y S1.T5 caso (f) (hallazgo 5): la evidencia de QA-02-16-05 se obtiene con docker build de server/ y el listado real de /app/resources y /app de la imagen construida (por ejemplo docker run --rm --entrypoint ls <imagen> -R /app/resources y ls -a /app), verificando que no hay DOCX, imágenes maestras ni docs/. Si Docker no está disponible en la sesión, reportar la evidencia como no ejecutada, no como pasada. Verificar además que server/.dockerignore no excluye resources/. (valida: REQ-03, REQ-08, test; rollback: Eliminar la imagen local construida (docker rmi) y revertir cualquier ajuste a server/Dockerfile o server/.dockerignore con git checkout.)
- S2: Ajuste S2.T1 (hallazgo 3): antes de implementar la paridad, leer en docs/content/catalogos/resultados.v1.json y en su JSON Schema de TAO-198 dónde vive catalogVersion. Si es a nivel de catálogo, comparar por content_key y usar el catalogVersion del catálogo para todas sus entradas (app y derivado); si el schema define versión por entrada, usarla. Registrar en la descripción de la task la ubicación exacta del campo encontrada. El error nombra la clave y ambas versiones. (valida: REQ-04; rollback: Revertir la lógica de paridad y sus tests con git checkout sobre server/scripts/generar-recurso-contenido.ts y su test.)
- S2: Ajuste S2.T2 (hallazgos 4 y 6): registrar el paso recurso:contenido:check en el job de ci-pr.yml que compila o verifica server/ (no en el job docs) y apuntar el sourceRef de REQ-02 a ese job. Además del git diff, correr localmente desde la raíz del repo el comando exacto del paso de CI (recurso:contenido:check, con el mismo --dir/--filter que use el workflow) y verificar que sale en 0. Confirmar que el job elegido hace checkout de docs/ y app/ (sin sparse-checkout que los excluya). Si el repo usa actionlint, validarlo sobre .github/workflows/ci-pr.yml. Confirmar con git diff que no se quitaron ni alteraron pasos existentes. (valida: REQ-02; rollback: Revertir .github/workflows/ci-pr.yml con git checkout.)

### Enmienda 2

**Task ops:**

- edit S1.T8 { desc="Evidencia de QA-02-16-05 (REQ-08): construir la imagen de server/ y listar su contenido real. Comandos exactos, ejecutados desde la raíz del repo: (1) 'docker build -t tao-server:ep02-check server/'; (2) 'docker run --rm --entrypoint ls tao-server:ep02-check -R /app/resources'; (3) 'docker run --rm --entrypoint ls tao-server:ep02-check -a /app'. Confirmar que /app/resources contiene solo contenido-referencia.v1.json y que /app no contiene DOCX, maestros de imagen ni documentos de docs/. Adjuntar los listados como evidencia. Si Docker no está disponible en la sesión, reportar la evidencia como no ejecutada, nunca como pasada.", rollback="Eliminar la imagen de prueba con 'docker rmi tao-server:ep02-check'. No hay cambios en archivos del repo que revertir." }
- edit S2.T1 { desc="Verificación de paridad (REQ-04): comparar por content_key el derivado server/resources/contenido-referencia.v1.json contra app/assets/catalogos/resultados.v1.json. Cuando una clave falte o la versión difiera, el mensaje de error usa el formato literal 'CONTENT_KEY: app=A servidor=B', donde CONTENT_KEY es la content_key real de la entrada, A es la versión del lado app y B es la versión del lado servidor. Ejemplo concreto: 'resultado.ejemplo: app=1.0.0 servidor=1.1.0'. La versión de cada entrada es el catalogVersion de su catálogo, salvo que el JSON Schema de TAO-198 defina content_version por entrada. Leer app/ solo en el modo --check y en las pruebas de vitest, nunca en runtime ni en el build de la imagen. Las pruebas deben afirmar el texto exacto del mensaje con el ejemplo 'resultado.ejemplo: app=1.0.0 servidor=1.1.0'.", rollback="Revertir los cambios de la task en el script y en sus pruebas con git (git checkout de esos archivos); el derivado y los catálogos no se tocan." }
## Sessions

### Session 1 · T2 · open

**Tasks:**
- [ ] S1.T1
- [ ] S1.T2
- [ ] S1.T3
- [ ] S1.T4
- [ ] S1.T5
- [ ] S1.T6
- [ ] S1.T7
- [ ] S1.T8

**Gate (auto)**: pnpm -C server run recurso:contenido genera server/resources/contenido-referencia.v1.json sin diff en una segunda corrida. recurso:contenido:check pasa en verde y falla con un fixture alterado nombrando resultados.v1.json. Las pruebas de vitest del lector pasan desde server/. La imagen construida desde server/ lista resources/ sin DOCX ni imágenes maestras.

### Session 2 · T1 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T2
- [ ] S2.T3
- [ ] S2.T4
- [ ] S2.T5
- [ ] S2.T6

**Gate (auto)**: recurso:contenido:check informa la clave y las dos versiones ante una discrepancia con app/assets/catalogos/resultados.v1.json (prueba visible en vitest). ci-pr.yml muestra el paso nuevo en el job de server/ sin cambios a los pasos existentes. docs/development/commands.md documenta el comando y pasa markdownlint.

### Session 3 · T0 · open
