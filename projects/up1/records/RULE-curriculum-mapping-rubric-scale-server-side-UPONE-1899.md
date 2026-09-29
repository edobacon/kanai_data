---
id: RULE-curriculum-mapping-rubric-scale-server-side-UPONE-1899
project: up1
type: rule
module: curriculum-mapping
level: must
tags:
  - UPONE-1899
  - rubric
  - performance-scale
  - server-side
  - validation
  - mcp
---

# El arbol y la rubrica se rechazan en el servidor si la matriz no tiene escala o si un nivel no pertenece a su escala

## What

Toda escritura del arbol de competencias o de su rubrica (upsertCompetencyTreeValidated, el guardado desde la actualizacion de la matriz, el asistente MCP) MUST rechazar en el servidor dos casos:

1. **Matriz sin escala de desempeno**: si la matriz no tiene `performanceScaleId`, no se guarda arbol con rubrica.
2. **Nivel fuera de la escala**: cada `levelId` de un descriptor de rubrica debe ser un nivel (no el esquema) de la escala de ESA matriz.

El filtro de la pantalla (`pruneDescriptors` en `rubric.ts`) es UX, no la regla: no protege a la API ni al asistente. Es la aplicacion concreta de [[RULE-server-side-logic-mcp-ready]] a este invariante.

## Why

La FK de `RubricDescriptor.levelId` apunta a toda la tabla de escalas (esquemas y niveles de todas las escalas), asi que la base acepta un nivel de otra escala o incluso el id de un esquema. La unica validacion de escala del servidor, `assertPublishable`, corre recien al publicar la matriz. Resultado: descriptores huerfanos, invisibles en la grilla, que se guardan con exito.

UPONE-1899 (CM-05) tenia este cierre como corazon del ticket (AC2 a AC4). El PR curriculum-mapping #42 no lo implemento: agrego `performanceScaleId` a `MATRIX_CONFIG_FIELDS` sin que ninguna regla lo lea, y documento en la ficha del asistente que el servidor no lo chequea (`aiPack.test.js` lo fija como comportamiento esperado). Lo detectaron tres revisiones seguidas del PR y lo confirmo un verificador adversarial.

## Where

- `logic/competencyTree-upsert.resolver.js`: tras `readMatrix` (escala presente) y en `persistRubric` (nivel de la escala).
- `logic/helpers/validateCompetencyTree.js`: `MATRIX_CONFIG_FIELDS` ya trae `performanceScaleId`.
- Patron a imitar: `assertLevelsInCatalog`, que ya valida `developmentLevelIds` contra su catalogo.

## When

Al tocar el guardado del arbol o de la rubrica, al exponer una nueva via de escritura (tool MCP, importacion) o al revisar un PR del modulo que toque rubricas.

## Verification

- Test: guardar arbol con rubrica sobre una matriz sin escala es rechazado con un error de dominio.
- Test: un descriptor con `levelId` de otra escala (y con el id del esquema) es rechazado.
- Ningun test ni texto de ficha afirma que el servidor no lo valida.

## Source

- **Discovered in**: UPONE-1899, revision del PR curriculum-mapping #42 (heads 31e9958 y 8bc784a), 2026-09-24.
- **Related**: [[RULE-server-side-logic-mcp-ready]], [[RULE-curriculum-mapping-rubric-weight-percentage-UPONE-1758]].
