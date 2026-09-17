---
id: DOC-kb-sp11-Reporte-del-fix-de-blockGeneric-bloqueo-de-escritura-generica-del-MCP-para-core
project: up1
type: doc
module: mcp
tags:
  - sp11
  - mcp
  - blockGenericMutation
  - UPONE-1758
  - reporte
  - core
  - seguridad
---

# Reporte del fix de blockGeneric (bloqueo de escritura generica del MCP) para core

Reporte de sp11 sobre el fix de bloqueo de mutaciones genericas del MCP, para reportar al equipo de core. Cubre: por que era necesario, que se hizo, por que se hizo asi, donde, como ayuda, y que requiere para seguir. Verificado leyendo la rama y el codigo (file:line), no el KB.

## 1. Por que era necesario

- Criterio del PO (sp10): ninguna via de escritura (UI, API, MCP) debe saltear una regla de negocio (`RULE-server-side-logic-mcp-ready`).
- El MCP no lo cumplia. `up1_create_object`/`up1_update_object`/`up1_delete_object` ejecutan las mutations genericas `createInstance`/`updateInstance`/`deleteInstance` del object-manager, sin consultar ningun contrato antes. Se registran de forma incondicional, fuera del gate de mods (`mcp-server.js:426` vs `:251`).
- Impacto concreto: los 10 objetos gobernados de curriculum-mapping (62 invariantes, todas en mutations `*Validated` separadas) eran escribibles por el generico salteando esas 62 reglas; el unico freno era RBAC. cm no podia autoprotegerse por override del generico (slot de un solo dueño, lo ocupa cd). tambien afectaba a otros objetos N1 de cualquier mod.

## 2. Que se hizo (verificado en la rama)

Rama `origin/UPONE-1758` del repo `up1/mcp`, commit de contenido `5ba9fb6` (10-sep-2026). NO mergeada; HEAD/develop no tiene nada de esto. Archivos nuevos: `src/contracts/generic-write-block.js` (356 lineas), `scripts/validate-governed-objects.js` (117), `test/generic-write-block.test.mjs` (767), `test/validate-governed-objects.test.mjs` (167).

Embudo unico de escritura, en la capa de transporte (`src/graphql-client.js`):
- `CREATE_INSTANCE`/`UPDATE_INSTANCE`/`DELETE_INSTANCE` pasan de `export const` a `const` privado (`:156-179`, agrupados en `GENERIC_WRITE_DOCS` no exportado).
- Guard anti-contrabando en `request()` (`:45-58`): rechaza cualquier query cuyo texto matchee `\bcreateInstance\s*\(` / update / delete, con error dirigido al programador ("usa up1.write(...)").
- `write(operation, variables, ctx)` es la unica via (`:70-81`): valida la operacion y llama `assertGenericWriteAllowed(objectType, operation)` (`:77`) antes de emitir a la red.

Indice y lookup (`src/contracts/generic-write-block.js`):
- `buildGenericWriteBlockIndex(packs)` (`:246-261`): indexa las declaraciones por clave en minusculas; dos declaraciones del mismo objectType se UNEN.
- `blockKey()` baja a minusculas (`:50`, porque el object-manager baja la primera letra al resolver el modelo Prisma, asi `CompetencyNode` y `competencyNode` escriben la misma tabla).
- `blockKeyCandidates()` (`:83-116`): pela alias `ext__<client>__<base>` y `rt__<recordType>__<base>` por segmentos. Cerraba un bypass real medido: 10 de 15 intentos de evasion pasaban nombrando el objeto por su recordType o proyeccion.
- `assertGenericWriteAllowed()` (`:325-331`): tira `BlockedGenericWriteError` (code `GENERIC_WRITE_BLOCKED`) si hay mensaje para esa operacion.
- Falla CERRADO (`ensureGenericWriteBlockIndex` `:303-318`): si el indice no se puede construir, rechaza.
- Indice global de proceso, no de sesion (`:263-282`): un objeto gobernado lo es siempre, aunque su mod no este activo en la sesion.

Tres puntos de entrada cableados: `src/mods/index.js:54` (setea el loader sobre todos los packs), `src/tools/register-declarative-tools.js:164-170` (chequea antes del preview), `src/tools/delete-with-impact.js:49` (chequea antes del preview de impacto). Ademas `mcp-server.js:223-228` saca las constantes del contexto que reciben los packs, cerrando el bypass via `registerExtra` (caso `as_set_rule_value`).

Formato de declaracion por mod: `governedObjects` (mapa `objectType -> {create?,update?,delete?}` con mensajes de negocio) o `blockGenericMutation` dentro de un contrato; `genericWriteAllowed` como escotilla. `validateBlockDeclaration` valida forma en build-time.

Gate de completitud (`scripts/validate-governed-objects.js`): opt-in por pack; si el pack declara alguna postura, exige que TODOS sus objetos (`mods/<mod>/objects/*.json`) esten decididos (bloqueado o `genericWriteAllowed`), y reporta indecisos, contradicciones y fantasmas.

## 3. Por que se hizo asi

- Embudo en el transporte (`up1.write`) y no en el motor de fichas: es el unico punto por el que pasan las TRES puertas (fichas genericas, `up1_delete_object` a mano, y `registerExtra` de un mod). Cubre mas que el plan original de sp10 (que proponia chequear solo en `registerOne`).
- Guard sintactico sin lista de excepciones: para que no se pueda evadir agregando codigo (una tool que arme su propio texto de mutation) ni configuracion. Un bloqueo que se evade agregando codigo normal no es un freno.
- Canonicalizacion de alias/casing: porque el object-manager resuelve varios strings a la misma tabla Prisma; sin pelar alias, el bloqueo se esquivaba trivialmente.
- Fail-closed y opt-in: fail-closed porque es el camino de escritura; opt-in porque el motor no puede saber por si mismo que objetos son gobernados (esa info vive en el resolver del backend), y opt-in es el unico default retrocompatible.

## 4. Donde

Todo en `up1/mcp`, rama `origin/UPONE-1758`. Contrapartes en los repos de mod (declaraciones y una migracion), aun sin pushear (ver seccion 6).

## 5. Como ayuda

Cierra el vector de escritura del MCP para cualquier objeto gobernado que se declare: un agente por MCP ya no puede corromper esos objetos por el CRUD generico. Es la pieza defensiva de la Linea A. Da a cm su unica palanca de auto-gobierno (cm no puede hacerlo por resolver).

Alcance declarado explicitamente (`generic-write-block.js:23-26`): cierra la puerta del MCP, NO el bypass cross-client (el bulk-edit generico del core y un GraphQL directo siguen llamando `updateInstance` sin pasar por aca). El cierre integral es escalar el invariante al resolver generico del object-manager (N3) o el mecanismo de interceptores componibles (ver propuesta a core). Esto es defensa en profundidad del lado MCP, no un reemplazo.

## 6. Que requiere para seguir (lockstep de 3 repos)

El motor esta pusheado pero solo, y hoy protege CERO objetos. Faltan las contrapartes, que deben mergear JUNTAS o el sistema queda peor que antes:
1. curriculum-mapping declara `governedObjects` de sus 10 objetos. NO existe en ninguna rama del submodulo; el test `curriculum-mapping-pack.test.mjs` de la rama YA FALLA por esto. (Es el ticket de cm, Camino 1.)
2. academic-scheduling migra `as_set_rule_value` de `up1.request(CREATE_INSTANCE/UPDATE_INSTANCE,...)` a `up1.write(...)`. NO pusheado. Sin esto la tool revienta al mergear. (~4 lineas; ver el documento Solicitud a academic-scheduling.)
3. curriculum-design: sincronizar al runtime sus fixes ya cerrados (Activity/Offering, commit `a70c3ab`).

Modos de falla si NO se mergean juntos: MCP solo -> bloquea cero, falsa sensacion de cierre; MCP + cm sin as -> rompe `as_set_rule_value`; un mod sin MCP -> `up1.write` no existe, rompe al reves.

Mitigacion antes de aprobar: pushear las piezas de cm y as a ramas (idealmente `UPONE-1758` en cada repo); mergear coordinado o con gate de despliegue; correr `npm run sync` + suite completa en checkout LIMPIO (el reporte de prueba original andaba por el estado local del dev, no versionado); y cablear `validate-governed-objects.js` como gate de PR (hoy solo corre en el build de Docker en push a develop/staging/master, `.woodpecker/build.yml`; un PR que rompa la completitud pasa verde y recien rompe el build integrado).

## 7. Doc a actualizar
`up1/mcp/.ai/PATTERNS.md:39` sigue diciendo que el filtrado dinamico de las tools genericas por objectType es "a separate, unsolved problem"; la rama lo resolvio para escritura y no actualizo la doc.

Ver el ticket de cm (Camino 1) y la propuesta a core (interceptores componibles), ambos sp11, y los documentos de sp10 (PLAN/VEREDICTO/REVISION de blockGenericMutation).
