---
id: DOC-kb-EP-01-Gate-de-CI-del-PR-agregado-de-epica-defectos-latentes-y-arreglos
project: taomangalam
type: doc
module: EP-01
tags:
  - ci
  - epica
  - pr-agregado
  - tooling
  - vale
  - frontmatter
  - billing
---

# Gate de CI del PR agregado de épica: defectos latentes y arreglos

## Contexto

El PR agregado de la épica (`epic/EP-01` → `main`, ~2792 archivos frente a la base) fue el primero con un diff de ese tamaño. Eso destapó cuatro defectos latentes del propio gate de CI, todos de la misma familia: herramientas que no escalan al conjunto de la épica. Ninguno tenía que ver con el código de los tickets.

## Defectos y arreglos

### 1. `Argument list too long` en el job `metadata`

- **Síntoma**: el job moría a los 8 segundos sin ejecutar nada.
- **Causa**: el job `changes` publicaba el diff completo como dos salidas multilínea (`files` y `status`), y `metadata` lo recibía como variable de entorno. Con 2792 archivos la lista `--name-status` ocupaba 249 KB, por encima del límite de 128 KB de un único string de argumentos/entorno, con lo que el proceso no llegaba a arrancar.
- **Arreglo**: el script `scripts/ci-pr-metadata.sh` calcula el diff por su cuenta (desde `BASE_SHA` o `BASE_REF`) y las salidas `files`/`status` se retiraron (no tenían ningún consumidor).
- **Commit**: `a29b4ef`.

### 2. Filtros que fallaban en silencio (SIGPIPE bajo `pipefail`)

- **Síntoma**: no se veía en los logs; los jobs del PR podían quedar omitidos y el gate dar un verde falso.
- **Causa**: los filtros de rutas del job `changes` leían la lista con `echo "$CHANGED" | grep -q …`. Bajo `set -o pipefail`, `grep -q` cierra el pipe al encontrar la coincidencia y el escritor muere con SIGPIPE; el resultado del pipeline queda distinto de cero y la condición se evalúa como falsa. Se reprodujo de forma aislada: con una lista grande, un patrón que coincide al principio devuelve falso.
- **Arreglo**: todos los filtros pasan a herestring (`grep -q … <<< "$CHANGED"`), sin pipe. Igual cambio en el chequeo de lockfiles del script de metadatos.
- **Commit**: `a29b4ef`.

### 3. `no merge base` al calcular el diff en el job de metadatos

- **Causa**: el checkout de `metadata` era superficial y no tenía ancestro común, así que `git diff BASE_SHA...HEAD` fallaba. El job `changes` ya usaba historial completo por la misma razón.
- **Arreglo**: `fetch-depth: 0` en el checkout del job.
- **Commit**: `00d9f48`.

### 4. Vale: falsos positivos y límite de la API de GitHub

- **Falsos positivos**: el PR agregado trae a `main` documentos que hasta ahora vivían solo en la rama, y la acción de Vale reporta hallazgos sobre líneas agregadas; por eso destapó 15 aciertos preexistentes. Eran incorrectos: la entrada `'vale': 'Vale'` del estilo disparaba sobre el verbo español ("cuál vale", "vale 8 puntos") y sobre el nombre `.vale.ini`, y la regla sobre las transcripciones verbatim de `docs/content/fuentes/` disparaba sobre el título original y el nombre del `.docx` de origen, donde normalizar la grafía falsificaría la transcripción.
- **Límite de la API**: el reporter de anotaciones de reviewdog necesita el diff del PR, y GitHub lo rechaza cuando supera los 300 archivos (`406`: "the diff exceeded the maximum number of files"). El paso fallaba sin evaluar los hallazgos.
- **Arreglo**: se retiró la entrada `'vale'` del estilo y la regla se desactiva solo para `docs/content/fuentes/*.md`; en el PR hacia `main` el paso corre sobre todo `docs/` (`filter_mode: nofilter`) y es best-effort (`continue-on-error`), mientras que en los PR por ticket conserva el filtro por líneas agregadas.
- **Commits**: `075849e`, `b04a936`, `4b47aa9`.

### 5. `CONTRIBUTING.md` sin frontmatter

- **Causa**: está en la baseline de documentos heredados, pero al modificarse vuelve a evaluarse y el verificador de frontmatter del job `docs` fallaba por su ausencia.
- **Arreglo**: se agregó el frontmatter conforme al contrato v1.1.0 (familia `root`).
- **Commit**: `c3be407`.

## Estado verificado

Con el diff real de 2792 archivos:

- `metadata` pasó en el último run que llegó a ejecutarse, con el script probado también en local contra el diff completo.
- Los jobs del PR ya no se omiten en silencio: `changes`, `security`, `backend-static`, `backend-test`, `dev-commands`, `contract`, `integration`, `widgetbook` y `flutter-static` en verde.
- El chequeo documental propio del repo (`docs.mjs check`, base `origin/main`) en verde.
- Vale local: 0 errores en los 12 documentos de producto y 0 en las transcripciones; la regla sigue marcando los casos reales (`widgetbook`/`mkdocs` en minúscula).

## Limitaciones conocidas

1. **El paso de Vale del PR de cierre no puede publicar anotaciones** si el diff supera los 300 archivos (límite de la API de GitHub). Queda best-effort en ese PR; la verificación de terminología se apoya en `pnpm docs:check` local, donde Vale sí está instalado. Para un gate bloqueante en el cierre hay que desacoplarlo de las anotaciones (por ejemplo, que lo corra el propio script del repo).
2. **El arreglo `continue-on-error` quedó sin verificar en CI**: al empujarlo, GitHub Actions dejó de arrancar jobs por un problema de facturación de la cuenta ("recent account payments have failed or your spending limit needs to be increased"). Los jobs fallan con 0 pasos, no por el código. Hay que resolver Billing & plans y relanzar. Por lo mismo nunca llegaron a correr en el PR agregado `flutter-test`, `flutter-goldens`, `build-smoke`, `ios-simulator` ni `qa-bundle`: quedaron cancelados por los pushes sucesivos o bloqueados por la facturación, así que el gate completo del conjunto está **sin verificar**.
