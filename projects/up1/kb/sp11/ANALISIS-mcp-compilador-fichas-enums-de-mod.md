---
id: DOC-kb-sp11-ANALISIS-mcp-compilador-fichas-enums-de-mod
project: up1
type: doc
module: mcp
tags:
  - sp11
  - mcp
  - core
  - fichas
  - compilador
  - enum
  - schema-index
  - curriculum-design
  - academic-scheduling
  - UPONE-1770
  - D1
  - deuda-tecnica
  - analisis
  - propuesta
  - resuelto
  - 6b04f93
---

# Análisis: el compilador de fichas del MCP no soporta enums de un mod en la respuesta

## Estado (actualizado 2026-09-25): RESUELTO en el core

El arreglo ya está en `origin/develop` de `up1/mcp`, en el commit `6b04f93` ("fix(sync): compile enums and base scalars as leaf fields", Clemente Jara, 2026-09-24). Cubre lo que proponía este análisis y más:

- Los enums de los mods se tratan como campo hoja, igual que un escalar (nuevo conjunto `leafTypes` en `buildSchemaIndex`).
- También se tratan como hoja los escalares propios y los enums del **schema base** de UP1 (por ejemplo `DateTime` y `FilterOperator`). Se leen como texto desde `object-manager/src/graphql/typeDefs/*.js`. Antes caían en el error contrario: el compilador exigía un `pick`, que es imposible de dar para algo sin campos.
- Si el tipo que devuelve la consulta es una hoja, no se arma selección de campos.
- Si un tipo con campos de un mod se llama igual que una hoja del base, gana el del mod.
- Tiene tests en `mcp/test/schema-index.test.mjs`.

Qué queda pendiente:

- Ya no hace falta un issue de Jira para el cambio de core.
- La ficha `cd_validate_curriculum_alignment_weights` sigue con su selección escrita a mano (vía de escape `graphql`). Deja de ser necesaria una vez aplicado el fix, pero se decidió no tocarla: es interina y se retira junto con el guard.
- La copia local de `up1/mcp` estaba 12 commits detrás de `origin/develop` al 2026-09-25, y el fix está entre ellos. Hay que actualizarla antes de correr el sync localmente.

Las secciones siguientes son el análisis original del 2026-09-24 y se conservan como registro.

## En una frase

Cuando una herramienta del asistente (una "ficha" del MCP) apunta a una consulta cuyo resultado tiene un campo de tipo **enum** declarado por un mod, el sync del MCP falla y la ficha no se puede publicar. El arreglo es chico y vive en el core del MCP (`up1/mcp`), pero requiere rama y revisión del equipo de plataforma.

## Glosario (para leer el resto sin dar nada por sabido)

- **Ficha MCP**: la declaración de una herramienta del asistente dentro de un mod, en `mods/<mod>/ai/tools.js`. Dice qué consulta o mutación GraphQL llama, qué argumentos recibe y qué devuelve. No trae el texto GraphQL: lo arma el sync.
- **Sync del MCP** (`npm run sync` en el workspace `mcp`, script `mcp/scripts/sync-mods.js`): copia las fichas de cada mod al MCP y, para cada una, **compila** el texto GraphQL leyendo el schema real del mod (`mods/<mod>/logic/*.schema.graphql`).
- **Selección de campos**: la lista de campos que la consulta GraphQL pide del resultado. GraphQL obliga a pedir explícitamente cada campo de un objeto; un escalar (texto, número) se pide solo por su nombre.
- **Enum**: un tipo GraphQL con un conjunto fijo de valores (p.ej. `GROUP_SUM_MISMATCH | MISSING_WEIGHT | INVALID_WEIGHT`). Para la selección se comporta como un escalar: se pide por su nombre y **no** tiene campos adentro.
- **Escape hatch `graphql`**: una ficha puede traer su texto GraphQL escrito a mano en la clave `graphql`; en ese caso el sync no la compila y la usa tal cual (`mcp/scripts/sync-mods.js:91`, `schema-index.js:138`).

## Qué pasa hoy (mecanismo, verificado en el código)

`mcp/scripts/schema-index.js` arma un índice de los schemas de los mods y, con él, la selección de campos de cada ficha:

1. `buildSchemaIndex` recorre los `.schema.graphql`. Para los **tipos objeto** registra sus campos en `typeFields` y su nombre en `knownTypes`. Para los **enums** (y los inputs) solo registra el nombre en `knownTypes` (líneas ~56-61), sin campos.
2. `buildSelection` (líneas ~84-133) recorre los campos del tipo que devuelve la consulta:
   - si el campo es un escalar de la lista fija `BUILTIN_SCALARS` (`ID, String, Int, Boolean, Float, JSON`), lo pide por su nombre;
   - si el tipo **no** está en `knownTypes` (objeto base de UP1), exige un `pick` explícito;
   - si el tipo **sí** está en `knownTypes`, asume que es un objeto del mod y **entra** a pedir sus campos.
3. Un enum de un mod está en `knownTypes` pero no tiene campos, así que cae en el tercer caso: `buildSelection` entra, no encuentra campos y lanza `Tipo "<Enum>" desconocido o sin campos`. El sync entero termina con exit 1.

Es el mismo tipo de hueco que ya se corrigió una vez para el escalar `JSON` (comentario de `BUILTIN_SCALARS` y commit `5056092 UPONE-1758 ajustes a BUILTIN_SCALARS`): un tipo que es "hoja" no estaba tratado como hoja.

## Cómo se descubrió

En el guard interino de suma 100 al publicar el plan (D1 de UPONE-1770, curriculum-design) se agregó la consulta `validateCurriculumAlignmentWeights`, cuyo resultado tiene `kind: CurriculumWeightProblemKind!` (un enum del mod), y su ficha `cd_validate_curriculum_alignment_weights`. La regresión del ticket corrió el sync del superrepo y falló en el workspace `mcp` con `Tipo "CurriculumWeightProblemKind" desconocido o sin campos (en "validateCurriculumAlignmentWeights.kind")`.

Ninguna ficha anterior exponía un enum de un mod en su respuesta; por eso el hueco no había aparecido.

## Qué se hizo mientras tanto (solo en el mod)

La ficha de curriculum-design lleva su selección escrita a mano (escape hatch `graphql`), validada contra el schema real con un test que además exige que pida **todos** los campos del tipo (si la consulta gana un campo, el test falla). El sync del MCP pasa. Commit `29820b4` en la rama `feat/UPONE-1770-d1-guard-suma-publicacion` de curriculum-design. Es interino igual que la ficha: se retira junto con el guard cuando llegue el motor de reglas del core.

La contra de ese camino: la selección manual no se actualiza sola, y cada mod que exponga un enum va a tener que repetir el mismo truco.

## Alcance e impacto

- **Hoy roto**: nada en producción. La única ficha afectada (curriculum-design) ya usa el escape hatch.
- **Latente** (ya no aplica tras `6b04f93`): academic-scheduling ya declara enums en tipos de salida (`mods/academic-scheduling/logic/unassign-bulk.schema.graphql`: `code: UnassignBulkFailureCode!` en el resultado de la mutación de quitar asignaciones en bloque). Hoy no tiene ficha, así que no falla; el día que alguien le agregue una ficha al asistente, el sync se cae igual.
- **Futuro**: cualquier mod que devuelva un estado, un tipo o un código como enum (patrón natural en GraphQL) choca con lo mismo.
- **Qué NO afecta**: los enums usados como **argumentos** de entrada (esos los resuelve `fieldArgsToGraphqlVars` y el validador de input de la ficha, `src/tools/type-schema.js`), ni los enums base de UP1 que no están declarados en ningún mod (siguen cayendo en el caso de `pick` explícito).

## Qué se necesita para ejecutarlo

**El cambio (en `up1/mcp`, core):**

1. En `buildSchemaIndex`, registrar los enums de los mods en un conjunto propio (p.ej. `enumTypes`), además de `knownTypes`.
2. En `buildSelection`, antes del caso "tipo del mod, entrar", tratar un campo cuyo tipo está en `enumTypes` como hoja: pedirlo por su nombre, igual que un escalar. Son unas pocas líneas.
3. Test en `mcp/test/schema-index.test.mjs`, que ya corre contra los schemas reales de los mods: compilar una ficha cuya respuesta tenga un enum (p.ej. contra `curriculum-design` y `CurriculumWeightProblemKind`, o contra `academic-scheduling` y `UnassignBulkFailureCode`) y verificar que el enum sale como hoja y que el texto resultante es GraphQL válido.
4. Opcional, después del merge: quitar el escape hatch de la ficha de curriculum-design para que vuelva a compilarse sola (el test del mod que valida la selección contra el schema sigue sirviendo igual).

**Prerequisitos y proceso:**

- ~~Issue en Jira para el cambio de core (no tiene uno propio todavía; nace como hallazgo de UPONE-1770 D1). Lo crea el PO o el equipo de plataforma.~~ Ya no hace falta: el cambio entró en `6b04f93`.
- Rama de ticket o de épica en `up1/mcp` con revisión del equipo de up1 antes de develop (regla de trabajo en core).
- La copia local de `up1/mcp` está 12 commits detrás de `origin/develop` al 2026-09-25; incluye el fix. Hay que actualizarla antes de correr el sync localmente.
- Correr la suite del MCP (`npm test` en `mcp`, encadena `schema-index.test.mjs` y `sync-mods.test.mjs` entre otras) y el sync del superrepo para confirmar que las 37 fichas actuales siguen compilando igual.

## Esfuerzo estimado

| Parte | Rango |
|---|---|
| Cambio en `schema-index.js` | 30 a 60 minutos |
| Test contra schema real + suite del MCP + sync | 1 a 2 horas |
| Revisión y merge (equipo de plataforma) | depende de la cola del equipo; el diff es chico |
| Quitar el escape hatch del mod (opcional) | 15 minutos + tests del mod |

**Riesgo**: bajo. El cambio solo agrega un caso nuevo ("enum del mod = hoja") en un camino que hoy siempre termina en error, así que no puede cambiar la compilación de ninguna ficha que hoy funciona. La verificación es mecánica: el sync compila las mismas 37 fichas y el texto de cada una no cambia.

## Opciones

- **A. Hacer el arreglo en el core** (recomendado): resuelve el caso para todos los mods y permite retirar el escape hatch de curriculum-design.
- **B. Dejarlo como convención documentada**: "si tu consulta devuelve un enum, escribe la selección a mano". Cero cambio de core, pero cada mod repite el truco y la primera persona que no lo sepa rompe el sync.
- **C. Pedir a los mods que devuelvan el enum como String**: evita el problema pero pierde el tipado del contrato; no se recomienda.

Se concretó la A en `6b04f93`.

## Documentos relacionados

- `NOTA-guard-publicacion-aporte-al-BRE-retiro-y-ventanas` (el guard interino donde apareció el caso y su lista de retiro, que incluye la ficha).
- `DECISION-guard-publicacion-interino-y-retiro-con-BRE`.
