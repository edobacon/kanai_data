---
id: TAO-008-SPEC
project: taomangalam
ticket: TAO-008
status: approved
---

# HU-00-01: estructura de monorepo, workspace pnpm y archivos base de colaboracion

## Resumen ejecutivo

Se deja el repositorio con su toolchain raiz (package.json con packageManager via Corepack, pnpm-workspace.yaml, pnpm-lock.yaml versionado y .nvmrc con Node 24 LTS), server/ fuera del workspace con su propio package.json y lockfile, y los archivos base de colaboracion (.github/CODEOWNERS, seis formularios de issue, plantilla de PR, CONTRIBUTING.md, .gitignore y README raiz). NO incluye proteccion de main ni checks obligatorios (HU-00-09), configuracion de editor ni .env.example (HU-00-13), ni la creacion del Project y sus vistas en GitHub (operacion DEC-203). Se sabe que funciona porque en un clon limpio 'corepack enable' y 'pnpm install --frozen-lockfile' terminan en codigo 0 con git status limpio, una copia aislada de server/ instala con su propio lockfile, 'git add -A --dry-run' no lista .env ni .env.local, y los gates documentales (check_citas.py, check_cobertura.py, build_*.py --check, unittest, check_backlog.py) siguen pasando. Tamano estimado: 2 sesiones (3 puntos, riesgo bajo). ADVERTENCIAS fuera de alcance: las carpetas app/, server/, docs/ y scripts/ ya existen segun taomangalam/README.md:11-14 y se reusan sin mover rutas, solo se crea lo faltante (tests/ y server/contract/ si no existen); los usuarios concretos de CODEOWNERS son variable operativa y quedan como placeholder a confirmar por el equipo; validar el revisor requerido por CODEOWNERS y el render de los formularios exige un PR/issue real en GitHub, verificacion manual fuera del repo.

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:107

La raiz del monorepo expone un toolchain reproducible: package.json con packageManager fijado para Corepack, pnpm-workspace.yaml, pnpm-lock.yaml versionado y .nvmrc con la minor de Node 24 LTS, de modo que 'corepack enable' + 'pnpm install --frozen-lockfile' instala en codigo 0 y deja git status limpio.

### REQ-02 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:108

server/ queda fuera del workspace pnpm de la raiz y es autoinstalable: tiene su propio package.json y server/pnpm-lock.yaml versionado, y pnpm-workspace.yaml no lo incluye en sus patrones (DEC-205, DEC-230).

### REQ-03 `confirmed`
> Fuente: Alcance > '.github/CODEOWNERS para contrato, autenticacion y permisos, migraciones, workflows y codigo nativo de respaldo (tecnologia/17 §2)' + Adenda 1: 'CODEOWNERS informativo con @edobacon para las areas criticas' + pedido de cambio: enumerar patrones concretos

.github/CODEOWNERS declara @edobacon como owner informativo con patrones concretos y explicitos: /server/contract/** (contrato), /server/src/middleware/** (autenticacion y permisos), /server/prisma/migrations/** (migraciones), /.github/workflows/** (workflows), /app/ios/** y /app/android/** (codigo nativo de respaldo). El archivo es sintacticamente valido (una regla por linea, patron seguido de owner con @) y su caracter es informativo: no implica aprobacion humana requerida ni revision de un tercero.

### REQ-04 `confirmed`
> Fuente: taomangalam/docs/backlog/tasks/TASK-EP-00-DEC-237_publicacion_github_y_handoff_selectivo_kanai.md:22

.github/ISSUE_TEMPLATE/ ofrece los seis formularios (epica, historia, task, bug, content/asset y spike) con los campos del doc 48 secciones 2 a 7 y el handoff selectivo a Kanai (DEC-237), y .github/pull_request_template.md precarga proposito, riesgo, pruebas, capturas, docs-impact y resultado de QA humana.

### REQ-05 `confirmed`
> Fuente: Adenda 1 - 2026-09-26 - dev + pedido de cambio (Alcance HU-00-01)

CONTRIBUTING.md documenta el modelo de ramas feature/*, fix/*, chore/* y hotfix/* y el flujo de merge de un solo mantenedor: pull request obligatorio para todo cambio a main, merge permitido solo con checks obligatorios en verde y conversaciones resueltas, squash merge ejecutado manualmente, sin aprobacion humana requerida y sin auto-merge habilitado, sin rama develop; y .gitignore excluye .env, .env.local, binarios, certificados, perfiles de firma y generados temporales en cualquier carpeta, conservando lockfiles, migraciones y contrato.

### REQ-06 `confirmed`
> Fuente: taomangalam/README.md:11

El repositorio conserva sus carpetas canonicas app/, server/, server/contract/, docs/, scripts/ y tests/ con el contenido actual y sin mover rutas de docs/, y el README raiz publica el mapa de carpetas y el inicio rapido actualizados.

### REQ-07 `inferred` `enforcement`
> Fuente: taomangalam/README.md:31

Los gates documentales existentes (check_citas.py, check_cobertura.py, los build_*.py --check, unittest y check_backlog.py) siguen pasando en local tras la historia, y ningun archivo nuevo de colaboracion rompe sus reglas de citas ni de cobertura.

### REQ-09 `confirmed`
> Fuente: Adenda 1 - 2026-09-26 - dev: 'Reflejar esta regla en CONTRIBUTING.md y en la documentacion canonica de estrategia CI/CD'

docs/product/tecnologia/17_estrategia_ci_cd_y_calidad.md refleja la politica de un solo mantenedor de forma consistente con CONTRIBUTING.md: CODEOWNERS informativo con @edobacon en las areas criticas, PR obligatorio sin aprobacion humana externa, merge condicionado a checks verdes y conversaciones resueltas, squash manual y sin auto-merge; y no queda en el documento ninguna afirmacion residual que exija revision o aprobacion de un tercero.
## Tasks

#### S1.T1 — Verificar y completar las carpetas canonicas app/, server/, server/contract/, docs/, scripts/ y tests/ reusando las existentes (taomangalam/README.md:11-14), creando solo las faltantes con archivo de marca versionable y sin mover ni renombrar nada bajo docs/.
Contrato: rollback: git rm de las carpetas y archivos de marca creados en este paso; ninguna ruta preexistente fue tocada, por lo que revertir el commit deja el arbol original.. Status: done

#### S1.T2 — Crear el package.json raiz con packageManager pnpm en version exacta para Corepack, engines de Node 24, pnpm-workspace.yaml que incluya app/ y excluya server/, y .nvmrc con la minor de Node 24 LTS; generar y versionar pnpm-lock.yaml raiz.
Contrato: rollback: git rm package.json, pnpm-workspace.yaml, pnpm-lock.yaml y .nvmrc; borrar node_modules raiz. El repo vuelve al estado sin workspace.. Status: done

#### S1.T3 — Dotar a server/ de su propio package.json autonomo y generar server/pnpm-lock.yaml versionado, verificando que no declara dependencias de workspace ni referencias a rutas fuera de server/ (DEC-205, DEC-230).
Contrato: rollback: git rm server/package.json y server/pnpm-lock.yaml; borrar server/node_modules.. Status: done

#### S1.T4 — Regresion del toolchain: en un clon limpio ejecutar corepack enable + pnpm install --frozen-lockfile (codigo 0 y git status vacio), repetir la instalacion para confirmar lockfile sin diff, instalar una copia de server/ en /tmp con su propio lockfile, comprobar que una dependencia agregada solo en server/package.json no altera el lockfile raiz, y que package.json raiz alterado sin lockfile hace fallar --frozen-lockfile.
Contrato: rollback: Descartar el clon temporal y la copia en /tmp; revertir con git checkout los archivos tocados durante las pruebas negativas.. Status: done

#### S2.T1 — Crear .github/CODEOWNERS con encabezado que declare su caracter informativo (no exige aprobacion humana ni revision de un tercero) y una regla por linea con @edobacon como owner en los patrones: /server/contract/**, /server/src/middleware/**, /server/prisma/migrations/**, /.github/workflows/**, /app/ios/** y /app/android/**. Validar por inspeccion local del archivo (sintaxis: patron seguido de owner con @, una regla por linea; cobertura: los seis patrones presentes), sin agregar scripts ni validadores nuevos.
Contrato: rollback: Eliminar .github/CODEOWNERS (git rm) o revertir el archivo a su estado previo con git checkout -- .github/CODEOWNERS; no quedan otros archivos afectados.. Status: done

#### S2.T2 — Reemplazar en el material de pruebas de la historia los casos que esperaban un revisor requerido (QA-00-01-02 y equivalentes) por casos de validacion de CODEOWNERS: sintaxis valida, cobertura de las cinco areas criticas, fallo con patron sin owner y deteccion de regla huerfana. Dejar los nuevos casos con el mismo formato y numeracion que usa el resto de QA-00-01-*.
Contrato: rollback: git checkout -- de los archivos de casos de prueba editados; los casos previos basados en revisor vuelven tal cual.. Status: done

#### S3.T1 — Crear .github/ISSUE_TEMPLATE/ con los seis formularios (epica, historia, task, bug, content/asset, spike) con los campos del doc 48 secciones 2 a 7 y el bloque de handoff selectivo a Kanai (DEC-237), mas config.yml si hace falta, y .github/pull_request_template.md con proposito, riesgo, pruebas, capturas, docs-impact (required/generated-only/none) y QA humana.
Contrato: rollback: git rm -r .github/ISSUE_TEMPLATE y .github/pull_request_template.md; GitHub vuelve al issue y PR en blanco.. Status: done

#### S3.T1.1 — Escribir los formularios de epica, historia y task con sus campos del doc 48 (secciones 2 a 4) y el bloque de handoff a Kanai donde aplica.
Contrato: rollback: git rm los tres .yml creados.. Status: done

#### S3.T1.2 — Escribir los formularios de bug, content/asset y spike con sus campos del doc 48 (secciones 5 a 7) y el recordatorio de no incluir correos reales ni datos de consultantes (doc 48 seccion 9).
Contrato: rollback: git rm los tres .yml creados.. Status: done

#### S3.T1.3 — Escribir .github/pull_request_template.md con proposito, riesgo, pruebas, capturas, docs-impact con sus tres valores y la seccion de resultado de QA humana.
Contrato: rollback: git rm .github/pull_request_template.md.. Status: done

#### S4.T1 — Cubrir conjuntamente los tres archivos de politica de colaboracion: (1) CONTRIBUTING.md con el modelo de ramas feature/*, fix/*, chore/* y hotfix/*, sin rama develop, y el flujo de un solo mantenedor: PR obligatorio para todo cambio a main, merge permitido solo con checks obligatorios en verde y conversaciones resueltas, squash merge ejecutado manualmente, sin aprobacion humana requerida y sin auto-merge; (2) .gitignore ampliando las exclusiones a .env, .env.local, binarios, certificados, perfiles de firma y generados temporales en cualquier carpeta, preservando lockfiles (pnpm-lock.yaml raiz y server/pnpm-lock.yaml), migraciones y contrato; (3) docs/product/tecnologia/17_estrategia_ci_cd_y_calidad.md alineado con CONTRIBUTING.md (CODEOWNERS informativo con @edobacon, PR obligatorio sin aprobacion externa, merge con checks verdes y conversaciones resueltas, squash manual, sin auto-merge), eliminando toda afirmacion residual que exija revision o aprobacion de un tercero. La configuracion efectiva de proteccion de main sigue en HU-00-09.
Contrato: rollback: Revertir los tres archivos a su estado previo: git checkout -- CONTRIBUTING.md .gitignore docs/product/tecnologia/17_estrategia_ci_cd_y_calidad.md (o eliminar CONTRIBUTING.md si no existia antes); el contenido documental previo queda intacto.. Status: done

#### S4.T2 — Actualizar el README raiz con el mapa de carpetas canonicas y el inicio rapido (nvm + corepack enable + pnpm install --frozen-lockfile), preservando los enlaces y comandos ya publicados en taomangalam/README.md:11-14 y :31-34.
Contrato: rollback: git checkout README.md para restaurar la version previa.. Status: done

#### S4.T3 — Ejecutar la verificacion local de la historia: inspeccion manual de .github/CODEOWNERS (sintaxis valida, una regla por linea, patron seguido de @edobacon, los seis patrones criticos cubiertos) y corrida de los gates documentales existentes (check_citas.py, check_cobertura.py, los build_*.py --check, unittest y check_backlog.py), verificando que todos siguen pasando. No introducir ni ejecutar validadores o scripts nuevos; solo se usan los gates ya existentes en el repositorio.
Contrato: rollback: No aplica: la task solo ejecuta verificaciones de solo lectura y no modifica archivos del repositorio.. Status: done

#### S5.T1 — Verificar REQ-03 por inspeccion directa de .github/CODEOWNERS: confirmar que estan las seis reglas (/server/contract/**, /server/src/middleware/**, /server/prisma/migrations/**, /.github/workflows/**, /app/ios/**, /app/android/**), que todas apuntan a @edobacon, que la sintaxis es valida (patron + owner por linea, sin lineas huerfanas) y que el archivo se declara informativo. La verificacion no depende de ningun script de validacion ni de que las rutas existan ya en el arbol.
Contrato: rollback: Tarea de verificacion sin efectos sobre el arbol; no requiere rollback.. Status: done

#### S5.T2 — Verificacion final documental y de higiene: confirmar que CONTRIBUTING.md y docs/product/tecnologia/17_estrategia_ci_cd_y_calidad.md describen el mismo flujo de un solo mantenedor (PR obligatorio, checks verdes, conversaciones resueltas, squash manual, sin aprobacion humana requerida, sin auto-merge, CODEOWNERS informativo) sin contradicciones ni restos que exijan revision de un tercero; verificar con 'git add -A --dry-run' que .env y .env.local no aparecen en ninguna carpeta; y correr los gates documentales existentes (check_citas.py, check_cobertura.py, build_*.py --check, unittest, check_backlog.py) sin fallos.
Contrato: rollback: Verificacion sin efectos: no requiere rollback. Ante fallo, corregir la documentacion o .gitignore en la sesion correspondiente y repetir.. Status: done
## Verificacion runtime

1. **Qué:** Verificar en runtime: .github/ISSUE_TEMPLATE/ ofrece los seis formularios (epica, historia, task, bug, content/asset y spike) con los campos del doc 48 secciones 2 a 7 y el handoff selectivo a Kanai (DEC-237), y .github/pull_request_template.md precarga proposito, riesgo, pruebas, capturas, docs-imp
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-03 (edit) `confirmed`: .github/CODEOWNERS declara @edobacon como owner informativo de las cinco areas criticas (contrato en server/contract/, autenticacion y permi
- REQ-08 (add) `confirmed`: CONTRIBUTING.md y la documentacion canonica de estrategia CI/CD declaran el flujo de colaboracion de un solo desarrollador: pull request obl
- REQ-09 (add) `confirmed`: La verificacion de CODEOWNERS de esta historia se hace sin abrir pull requests: consiste en validacion de sintaxis del archivo, comprobacion
- REQ-10 (add) `confirmed`: Esta historia no configura la proteccion efectiva de main: no declara CODEOWNERS como reviewers requeridos en reglas de rama, no define ni a

**Tasks agregadas:**

- S2: Escribir .github/CODEOWNERS con @edobacon como owner informativo y patrones explicitos para las cinco areas criticas: server/contract/, rutas de autenticacion y permisos, server/prisma/migrations/**, .github/workflows/** y el directorio de codigo nativo de respaldo. Agregar un comentario de cabecera aclarando que el archivo es senal de area critica y no un gate de aprobacion, dado que el repositorio lo mantiene una sola persona. (valida: REQ-03; rollback: git checkout -- .github/CODEOWNERS (o eliminar el archivo si no existia antes); no quedan efectos fuera del repo.)
- S2: Actualizar CONTRIBUTING.md: mantener el modelo de ramas feature/*, fix/*, chore/*, hotfix/* sin develop y agregar la seccion de flujo de un solo desarrollador (PR obligatorio, checks obligatorios en verde, conversaciones resueltas, squash merge manual, sin aprobacion humana requerida, sin auto-merge). Eliminar cualquier redaccion que implique revision o aprobacion de una persona distinta del autor. (valida: REQ-08, REQ-05; rollback: git checkout -- CONTRIBUTING.md para restaurar la redaccion previa.)
- S2: Reflejar la misma regla en la documentacion canonica de estrategia CI/CD (docs/): PR obligatorio, checks verdes, conversaciones resueltas, squash merge manual, sin aprobacion humana y sin auto-merge, dejando explicito que la configuracion efectiva de proteccion de main pertenece a HU-00-09. Ajustar citas segun las reglas de check_citas.py. (valida: REQ-08, REQ-10; rollback: git checkout -- del documento canonico de CI/CD; el contenido previo queda intacto y los enlaces existentes no cambian.)
- S3: Agregar al gate de verificacion la comprobacion de CODEOWNERS sin abrir PR: validar sintaxis del archivo, verificar que cada una de las cinco areas criticas queda cubierta por al menos un patron con @edobacon, y consultar los errores de CODEOWNERS que reporta GitHub, degradando de forma explicita (solo validacion local) si no hay autenticacion gh disponible. (valida: REQ-09, REQ-03, test; rollback: Revertir el script o paso de verificacion agregado; ningun archivo de configuracion del repositorio remoto se modifica.)
- S3: Verificar el flujo documentado de un solo desarrollador: confirmar que CONTRIBUTING.md y el documento canonico de CI/CD declaran los cinco puntos del flujo y no contienen exigencias de revisor externo, y que el diff de la historia no toca proteccion de main, checks obligatorios ni auto-merge. Re-ejecutar los gates documentales (check_citas.py, check_cobertura.py, build_*.py --check, unittest, check_backlog.py). (valida: REQ-08, REQ-10, REQ-07, test; rollback: Revertir el paso de verificacion agregado; no altera contenido documental ni configuracion del repositorio.)

### Enmienda 2
**REQs:**

- REQ-03 (edit) `confirmed`: El repositorio opera con un unico mantenedor: .github/CODEOWNERS es informativo y asigna @edobacon a las areas criticas (server/contract/, a
- REQ-08 (add) `confirmed`: CONTRIBUTING.md documenta el flujo de un solo mantenedor de forma explicita: pull request obligatorio para todo cambio a main (nada de push
- REQ-09 (add) `confirmed`: docs/product/tecnologia/17_estrategia_ci_cd_y_calidad.md refleja la politica de un solo mantenedor de forma consistente con CONTRIBUTING.md:
- REQ-10 (add) `inferred`: La validacion de CODEOWNERS vive como script ejecutable en scripts/ (misma familia y convenciones que los gates documentales existentes: eje

**Tasks agregadas:**

- S2: Reescribir .github/CODEOWNERS como archivo informativo de un solo mantenedor: una regla por area critica (server/contract/, rutas de autenticacion y permisos, server/prisma/migrations/**, .github/workflows/**, codigo nativo de respaldo) con @edobacon como owner, mas comentario de cabecera que aclare que es informativo y que no habilita aprobacion de un revisor distinto del autor. Verificar contra el arbol real que cada patron matchea rutas existentes. (valida: REQ-03; rollback: git checkout -- .github/CODEOWNERS (o borrar el archivo si no existia antes del cambio); ningun otro archivo queda tocado por esta task.)
- S2: Crear el validador de CODEOWNERS en scripts/ (solo biblioteca estandar, al estilo de los check_*.py existentes): parsea .github/CODEOWNERS, valida sintaxis linea a linea (patron presente, al menos un owner con @, sin owners malformados), verifica que cada area critica declarada quede cubierta por al menos una regla que matchee rutas reales del repo, reporta reglas huerfanas, e imprime motivo y sale con codigo distinto de 0 ante cualquier fallo. (valida: REQ-10, REQ-03; rollback: Borrar el script agregado en scripts/; no modifica ningun gate existente ni el CODEOWNERS.)
- S2: Actualizar CONTRIBUTING.md con el flujo de un solo mantenedor: PR obligatorio sin push directo a main, merge solo con checks obligatorios verdes y conversaciones resueltas, squash merge manual, auto-merge no habilitado, CODEOWNERS informativo sin aprobacion de un tercero (con el motivo), y nota de que la proteccion efectiva de main es HU-00-09. Preservar intacto el modelo de ramas y la ausencia de develop de REQ-05. (valida: REQ-08; rollback: git checkout -- CONTRIBUTING.md; el modelo de ramas previo vuelve sin tocar CODEOWNERS ni docs.)
- S2: Actualizar docs/product/tecnologia/17_estrategia_ci_cd_y_calidad.md para alinearlo con la adenda: CODEOWNERS informativo con @edobacon, PR obligatorio sin aprobacion humana externa, merge con checks verdes y conversaciones resueltas, squash manual, sin auto-merge. Barrer el documento en busca de afirmaciones residuales que exijan revisor o aprobacion de un tercero y corregirlas; mantener las citas resolubles. (valida: REQ-09; rollback: git checkout -- docs/product/tecnologia/17_estrategia_ci_cd_y_calidad.md; el texto previo del documento canonico vuelve sin afectar CONTRIBUTING.md.)
- S2: Reemplazar en el material de pruebas de la historia los casos que esperaban un revisor requerido (QA-00-01-02 y equivalentes) por casos de validacion de CODEOWNERS: sintaxis valida, cobertura de las cinco areas criticas, fallo con patron sin owner y deteccion de regla huerfana. Dejar los nuevos casos con el mismo formato y numeracion que usa el resto de QA-00-01-*. (valida: REQ-03; rollback: git checkout -- de los archivos de casos de prueba editados; los casos previos basados en revisor vuelven tal cual.)
- S2: Correr la bateria completa de verificacion local tras los cambios: el validador nuevo de CODEOWNERS (caso valido, caso con owner malformado y caso de area sin cubrir, cada uno con el codigo de salida esperado), y los gates documentales check_citas.py, check_cobertura.py, los build_*.py --check, unittest y check_backlog.py. Reportar cada fallo clasificado como introducido o preexistente. (valida: REQ-10, REQ-09, REQ-08, REQ-07, test; rollback: No modifica archivos; si la verificacion expone un fallo introducido, revertir la task que lo origino.)

### Enmienda 3
**REQs:**

- REQ-03 (edit) `confirmed`: .github/CODEOWNERS asigna @edobacon como owner informativo de server/contract/**, autenticacion y permisos, server/prisma/migrations/**, .gi
- REQ-05 (edit) `confirmed`: CONTRIBUTING.md documenta el modelo de ramas feature/*, fix/*, chore/* y hotfix/* y el flujo de merge de un solo mantenedor: pull request ob

**Task ops:**

- edit S2.T1 { desc="Escribir .github/CODEOWNERS con @edobacon como owner informativo de los cinco patrones criticos (server/contract/**, rutas de autenticacion y permisos, server/prisma/migrations/**, .github/workflows/** y codigo nativo de respaldo), una regla por linea con patron + owner. No configurar ni documentar aqui solicitud de revisor ni aprobacion requerida: el archivo es informativo y la proteccion efectiva de main pertenece a HU-00-09.", rollback="Eliminar .github/CODEOWNERS (git rm) o revertir el commit que lo agrega; el repositorio vuelve a no declarar owners y el flujo de PR no cambia.", validates=["REQ-03"] }
- edit S2.T3 { desc="Escribir CONTRIBUTING.md con el modelo de ramas (feature/*, fix/*, chore/*, hotfix/*, sin develop) y el flujo de un solo mantenedor: PR obligatorio a main, merge solo con checks obligatorios verdes y conversaciones resueltas, squash merge manual, sin aprobacion humana requerida, sin auto-merge, CODEOWNERS informativo, y nota de que la proteccion efectiva de main es HU-00-09. Actualizar docs/product/tecnologia/17_estrategia_ci_cd_y_calidad.md con esa misma regla, dejandolo consistente con CONTRIBUTING.md y sin afirmaciones residuales que exijan revision o aprobacion de un tercero.", rollback="Revertir CONTRIBUTING.md y docs/product/tecnologia/17_estrategia_ci_cd_y_calidad.md al contenido previo (git checkout de ambos archivos en el commit anterior); la documentacion vuelve a su redaccion original sin afectar codigo ni configuracion.", validates=["REQ-05","REQ-08","REQ-09"] }
- edit S2.T5 { desc="Implementar el script de validacion de CODEOWNERS en scripts/ (misma familia y convenciones que los gates documentales: ejecutable en local, salida legible, exit 0/distinto de 0, sin dependencias nuevas): verifica sintaxis linea a linea (patron no vacio + al menos un owner con @, sin owners malformados) y cobertura de los cinco patrones criticos, comprobando que cada uno matchea rutas reales del repo y asigna @edobacon. No incluir ninguna comprobacion de revisor solicitado ni de aprobacion.", rollback="Eliminar el script de scripts/ y su invocacion en el gate de la sesion; los demas gates documentales siguen corriendo sin cambios.", validates=["REQ-03","REQ-10"] }
- edit S2.T17 { desc="Gate de la sesion 2: correr el script de validacion de CODEOWNERS (sintaxis + cobertura de los cinco patrones con @edobacon) y 'gh api repos/:owner/:repo/codeowners/errors' esperando lista vacia; verificar que CONTRIBUTING.md y docs/product/tecnologia/17_estrategia_ci_cd_y_calidad.md declaran PR obligatorio, checks verdes, conversaciones resueltas, squash manual, sin aprobacion requerida y sin auto-merge; y que ningun archivo de la sesion exige un revisor solicitado. Correr ademas los gates documentales existentes (check_citas.py, check_cobertura.py, build_*.py --check, unittest, check_backlog.py).", rollback="El gate es solo verificacion: no muta el repositorio. Ante fallo, revertir los commits de la sesion 2 senalados por la salida del gate.", validates=["REQ-03","REQ-05","REQ-08","REQ-09","REQ-10","REQ-07"], isTest=true }
- edit S3.T1 { desc="Verificacion final de colaboracion: validar sintaxis y cobertura de CODEOWNERS con el script de scripts/ y con 'gh api repos/:owner/:repo/codeowners/errors' (lista vacia), confirmando que los cinco patrones criticos asignan @edobacon. No probar revisor requerido ni aprobacion: el repositorio tiene un solo mantenedor y la proteccion efectiva de main queda fuera de alcance (HU-00-09).", rollback="Verificacion sin efectos: no requiere rollback. Ante fallo, corregir CODEOWNERS o el script en la sesion 2 y repetir.", validates=["REQ-03","REQ-10"], isTest=true }
- edit S3.T2 { desc="Verificacion final documental y de higiene: confirmar que CONTRIBUTING.md y docs/product/tecnologia/17_estrategia_ci_cd_y_calidad.md describen el mismo flujo de un solo mantenedor (PR obligatorio, checks verdes, conversaciones resueltas, squash manual, sin aprobacion humana requerida, sin auto-merge, CODEOWNERS informativo) sin contradicciones ni restos que exijan revision de un tercero; verificar con 'git add -A --dry-run' que .env y .env.local no aparecen en ninguna carpeta; y correr los gates documentales existentes (check_citas.py, check_cobertura.py, build_*.py --check, unittest, check_backlog.py) sin fallos.", rollback="Verificacion sin efectos: no requiere rollback. Ante fallo, corregir la documentacion o .gitignore en la sesion correspondiente y repetir.", validates=["REQ-05","REQ-08","REQ-09","REQ-07"], isTest=true }

### Enmienda 4

**Task ops:**

- edit S2.T3 { desc="Ampliar .gitignore en la raiz para cubrir lo exigido por REQ-05, ademas de lo ya previsto en esta task: ignorar .env y .env.local a cualquier profundidad (patrones sin ancla de ruta, p.ej. **/.env y **/.env.local, de modo que tambien tomen server/.env y app/.env.local), binarios y artefactos compilados, certificados y material de firma (*.p12, *.keystore, *.jks, *.mobileprovision, *.cer, *.pem), perfiles de firma y generados temporales (build/, dist/, .tmp/, *.log, caches de herramientas). Preservar integras las reglas ya existentes del archivo (no borrar ni reescribir lineas previas; solo agregar bloques nuevos comentados por categoria) y no ignorar lockfiles (pnpm-lock.yaml raiz ni server/pnpm-lock.yaml), migraciones (server/prisma/migrations/**) ni contrato (server/contract/**): si algun patron amplio los alcanzara, agregar la negacion explicita (!) correspondiente. Verificar con 'git add -A --dry-run' sobre un .env y un server/.env ficticios que no aparezcan, y con 'git check-ignore -v' que lockfiles, migraciones y contrato NO queden ignorados.", validates=["REQ-05"] }

**REQ ops:**

- remove REQ-08

### Enmienda 5
**REQs:**

- REQ-03 (edit) `confirmed`: .github/CODEOWNERS declara @edobacon como owner informativo con patrones concretos y explicitos: /server/contract/** (contrato), /server/src

**Task ops:**

- delete S2.T5
- edit S2.T1 { desc="Crear .github/CODEOWNERS con las seis reglas informativas, todas con owner @edobacon: /server/contract/**, /server/src/middleware/** (autenticacion y permisos), /server/prisma/migrations/**, /.github/workflows/**, /app/ios/** y /app/android/**. Incluir un encabezado en comentario que aclare el caracter informativo (sin aprobacion humana requerida). Validar el archivo localmente durante la tarea: revisar a ojo/por inspeccion que cada linea tenga patron + owner con @, que no haya duplicados ni owners distintos de @edobacon, y que los seis patrones esten presentes. No crear scripts ni archivos de validacion adicionales.", rollback="Borrar .github/CODEOWNERS (archivo nuevo, sin consumidores en el repo); el resto del arbol queda intacto.", validates=["REQ-03"], isTest=false }
- edit S3.T1 { desc="Verificar REQ-03 por inspeccion directa de .github/CODEOWNERS: confirmar que estan las seis reglas (/server/contract/**, /server/src/middleware/**, /server/prisma/migrations/**, /.github/workflows/**, /app/ios/**, /app/android/**), que todas apuntan a @edobacon, que la sintaxis es valida (patron + owner por linea, sin lineas huerfanas) y que el archivo se declara informativo. La verificacion no depende de ningun script de validacion ni de que las rutas existan ya en el arbol.", rollback="Tarea de verificacion sin efectos sobre el arbol; no requiere rollback.", validates=["REQ-03"], isTest=true }

**REQ ops:**

- remove REQ-10

### Enmienda 6

**Task ops:**

- edit S2.T1 { desc="Crear .github/CODEOWNERS con encabezado que declare su caracter informativo (no exige aprobacion humana ni revision de un tercero) y una regla por linea con @edobacon como owner en los patrones: /server/contract/**, /server/src/middleware/**, /server/prisma/migrations/**, /.github/workflows/**, /app/ios/** y /app/android/**. Validar por inspeccion local del archivo (sintaxis: patron seguido de owner con @, una regla por linea; cobertura: los seis patrones presentes), sin agregar scripts ni validadores nuevos.", rollback="Eliminar .github/CODEOWNERS (git rm) o revertir el archivo a su estado previo con git checkout -- .github/CODEOWNERS; no quedan otros archivos afectados.", validates=["REQ-03"], isTest=false }
- edit S2.T3 { desc="Cubrir conjuntamente los tres archivos de politica de colaboracion: (1) CONTRIBUTING.md con el modelo de ramas feature/*, fix/*, chore/* y hotfix/*, sin rama develop, y el flujo de un solo mantenedor: PR obligatorio para todo cambio a main, merge permitido solo con checks obligatorios en verde y conversaciones resueltas, squash merge ejecutado manualmente, sin aprobacion humana requerida y sin auto-merge; (2) .gitignore ampliando las exclusiones a .env, .env.local, binarios, certificados, perfiles de firma y generados temporales en cualquier carpeta, preservando lockfiles (pnpm-lock.yaml raiz y server/pnpm-lock.yaml), migraciones y contrato; (3) docs/product/tecnologia/17_estrategia_ci_cd_y_calidad.md alineado con CONTRIBUTING.md (CODEOWNERS informativo con @edobacon, PR obligatorio sin aprobacion externa, merge con checks verdes y conversaciones resueltas, squash manual, sin auto-merge), eliminando toda afirmacion residual que exija revision o aprobacion de un tercero. La configuracion efectiva de proteccion de main sigue en HU-00-09.", rollback="Revertir los tres archivos a su estado previo: git checkout -- CONTRIBUTING.md .gitignore docs/product/tecnologia/17_estrategia_ci_cd_y_calidad.md (o eliminar CONTRIBUTING.md si no existia antes); el contenido documental previo queda intacto.", validates=["REQ-05","REQ-09"], isTest=false }
- edit S2.T14 { desc="Ejecutar la verificacion local de la historia: inspeccion manual de .github/CODEOWNERS (sintaxis valida, una regla por linea, patron seguido de @edobacon, los seis patrones criticos cubiertos) y corrida de los gates documentales existentes (check_citas.py, check_cobertura.py, los build_*.py --check, unittest y check_backlog.py), verificando que todos siguen pasando. No introducir ni ejecutar validadores o scripts nuevos; solo se usan los gates ya existentes en el repositorio.", rollback="No aplica: la task solo ejecuta verificaciones de solo lectura y no modifica archivos del repositorio.", validates=["REQ-03","REQ-07"], isTest=true }
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4

**Gate (auto)**: En un clon limpio con el Node de .nvmrc: `corepack enable` + `pnpm install --frozen-lockfile` en la raiz termina en codigo 0 y `git status` queda limpio; una copia de server/ en /tmp instala sola con su propio server/pnpm-lock.yaml; una dependencia agregada solo en server/package.json no altera el lockfile raiz y un package.json raiz alterado hace fallar --frozen-lockfile. Se revisa en la terminal (salida de los comandos) y en el arbol del repo: carpetas canonicas app/, server/, server/contract/, docs/, scripts/ y tests/ presentes, sin rutas de docs/ movidas.

### Session 2 · T1 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2

**Gate (auto)**: Se abre .github/CODEOWNERS y se ve el encabezado que declara su caracter informativo y una regla por linea con @edobacon para los seis patrones criticos (/server/contract/**, /server/src/middleware/**, /server/prisma/migrations/**, /.github/workflows/**, /app/ios/**, /app/android/**); y en el material de pruebas de la historia los casos QA-00-01-* ya no esperan un revisor requerido sino validacion de sintaxis, cobertura de areas, patron sin owner y regla huerfana, con el mismo formato y numeracion.

### Session 3 · T2 · continue

**Tasks:**
- [x] S3.T1
- [x] S3.T1.1
- [x] S3.T1.2
- [x] S3.T1.3

**Gate (auto)**: En GitHub, al pulsar 'New issue' se ofrecen los seis formularios (epica, historia, task, bug, content/asset, spike) con los campos del doc 48 secciones 2 a 7 y el bloque de handoff selectivo a Kanai; y al abrir un PR de prueba la descripcion precarga proposito, riesgo, pruebas, capturas, docs-impact (required/generated-only/none) y la seccion de QA humana. Evidencia: capturas del selector de formularios y del PR precargado.

### Session 4 · T2 · continue

**Tasks:**
- [x] S4.T1
- [x] S4.T2
- [x] S4.T3

**Gate (auto)**: Se leen CONTRIBUTING.md (ramas feature/*, fix/*, chore/*, hotfix/*, sin develop, PR obligatorio, merge solo con checks verdes y conversaciones resueltas, squash manual, sin aprobacion humana ni auto-merge), docs/product/tecnologia/17_estrategia_ci_cd_y_calidad.md sin afirmaciones residuales de revision de terceros, el README raiz con mapa de carpetas e inicio rapido, y .gitignore verificado con `git add -A --dry-run` sobre un .env/.env.local ficticio (no aparece) mientras lockfiles, migraciones y contrato se conservan. Cierra con la corrida local de los gates existentes (check_citas.py, check_cobertura.py, build_*.py --check, unittest, check_backlog.py) en verde.

### Session 5 · T0 · continue

**Tasks:**
- [x] S5.T1
- [x] S5.T2
