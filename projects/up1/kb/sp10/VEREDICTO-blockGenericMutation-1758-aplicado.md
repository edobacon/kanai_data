---
id: DOC-kb-sp10-VEREDICTO-blockGenericMutation-1758-aplicado
project: up1
type: doc
module: mcp
tags:
  - sp10
  - mcp
  - blockGenericMutation
  - UPONE-1758
  - veredicto
  - code-review
  - riesgo
  - lockstep
---

# Veredicto del blockGenericMutation aplicado en UPONE-1758 y riesgo de merge en lockstep

Auditoria del codigo REALMENTE aplicado en la rama `origin/UPONE-1758` del repo MCP (`up1/mcp`), contrastado contra los repos de los mods (`curriculum-mapping`, `academic-scheduling`). Complementa `PLAN-blockGenericMutation-mcp`, `ANALISIS-blockGenericMutation-impacto-flujos` y `ANALISIS-blockGenericMutation-testing-1758-aporte`. Verificado leyendo el diff y el codigo, no el reporte.

## Veredicto corto

Como ingenieria del mecanismo: correcto y por encima del plan. Como entrega lista para mergear: NO todavia. Faltan dos piezas que viven en los repos de los mods (no en el MCP) y sin las cuales, al mergear, el mecanismo o no bloquea nada o rompe una tool. No son defectos de diseño, son piezas cross-repo sin aterrizar.

## Lo que esta bien, y supera el plan

Punto de enforcement mejor que el propuesto. En vez de chequear en `registerOne` (motor de fichas, cubre solo una de las tres puertas de escritura), el bloqueo vive en `Up1GraphQLClient.write()` (`src/graphql-client.js`), el unico embudo por el que pasan las tres puertas (fichas genericas, `up1_delete_object` a mano, y `registerExtra` de un mod).

- Encapsula los documentos createInstance/updateInstance/deleteInstance (ya no se exportan) y agrega un guard anti-contrabando en `request()`: cualquier query cuyo texto contenga esas mutations se rechaza. Cierra el bypass del "codigo futuro" (una tool que arme su propio texto de mutation), mas fuerte que comparar por referencia.
- Canonicalizacion/alias (`blockKeyCandidates` en `src/contracts/generic-write-block.js`): pela prefijos `rt__`/`ext__` por segmentos, baja a minusculas y hace trim. Cierra el bypass por casing, proyeccion de recordType o espacios que el reporte hallo (10 de 15 vectores escapaban antes). Pela por segmento porque clientCode y recordType son arbitrarios; exige base para no bloquear `rt__matrix__` vacio.
- Falla cerrado (si no puede armar el indice, rechaza, mismo criterio que capability-gate), opt-in retrocompatible, indice global de proceso (no de sesion: un objeto gobernado lo es siempre), validacion de forma en build-time (declaracion mal tipeada revienta fuerte, no queda muda), y chequeo de completitud en el sync (`scripts/validate-governed-objects.js`) que impide bloquear la matriz dejando sus satelites abiertos.

Contra lo esperado: cumple el Track 1 (vector MCP) y lo hace mejor; deja el Track 2 (cierre cross-client / resolver) fuera de alcance, redactado como ticket de ajuste, con el vector concreto `deleteBulkInstances` identificado. Lo unico nuestro que no contempla es declarativizar invariantes a `core_ObjectValidation`/constraints; sigue complementario y abierto.

## Los dos huecos reales de lo aplicado (cross-repo)

**1. Las declaraciones de gobernanza no estan commiteadas en ningun repo de mod. Hoy el mecanismo no bloquea nada.** `src/mods/` es generado (gitignored); la fuente es el `ai/` de cada mod. curriculum-mapping NO declara `governedObjects` ni `blockGenericMutation` en su working tree, ni en `develop`, ni en `origin/UPONE-1758`. La copia generada local tampoco. En el repo MCP esos tokens solo aparecen en el mecanismo, los tests (fixtures sinteticos) y el validador. El reporte probo cm bloqueado con una declaracion que existe en el entorno del dev pero no esta pusheada. Mergear `origin/UPONE-1758` tal cual entra el motor sin datos que bloquear.

**2. Cambio breaking cross-repo sin la contraparte del mod. Romperia `as_set_rule_value`.** La rama MCP saca `CREATE_INSTANCE`/`UPDATE_INSTANCE` del `modCtx` de `registerExtra` (mcp-server.js) y hace que `request()` rechace esos textos. Pero `as_set_rule_value` (academic-scheduling) sigue, en `develop` y en TODAS sus ramas, llamando `up1.request(UPDATE_INSTANCE, ...)` con esas constantes por ctx. No hay ninguna rama del mod que lo migre a `up1.write("update", ...)`. Con la rama MCP mergeada y el mod sin migrar, esa tool (unica escritura por generico de academic-scheduling) recibe undefined y falla. El reporte la muestra andando porque en el entorno del dev el mod estaba migrado; esa migracion no esta versionada.

**3. Hueco silencioso del opt-in para cd/as.** El validador es opt-in por pack: solo chequea al que declara postura. curriculum-design y academic-scheduling no declaran nada, asi que un objeto gobernado sin declarar en esos dos queda escribible sin aviso. Correctamente diferido a UPONE-1757, pero es parte de lo que falta para el cierre integral.

## RIESGO: merge en lockstep de tres repos

El cambio abarca tres repos que deben mergear JUNTOS o el sistema queda peor que antes:

- `up1/mcp` (rama `origin/UPONE-1758`): el motor. Ya pusheado.
- `curriculum-mapping`: debe declarar `governedObjects` de sus 10 objetos (matriz + satelites: rubricas, tablas puente, adopcion). NO pusheado en ninguna rama.
- `academic-scheduling`: debe migrar `as_set_rule_value` de `up1.request(UPDATE_INSTANCE/CREATE_INSTANCE)` a `up1.write("update"|"create")`. NO pusheado en ninguna rama.

Modos de falla si NO se mergean juntos:
- MCP solo: el motor entra pero no bloquea nada (sin declaraciones). Falsa sensacion de cierre.
- MCP + cm sin academic-scheduling: bloquea cm, pero rompe `as_set_rule_value` (unica escritura por generico de as) porque el modCtx ya no trae las constantes y `request()` rechaza el texto.
- Cualquiera de los mods sin MCP: el mod usa `up1.write`/declara gobernanza que el MCP viejo no conoce (write no existe) -> rompe al reves.

Mitigacion recomendada antes de aprobar:
1. Pedir que cm y academic-scheduling pusheen sus piezas a ramas (idealmente `UPONE-1758` en cada repo).
2. Confirmar que las tres ramas se mergean coordinadas (o gate de despliegue que las libere juntas).
3. Correr `npm run sync` + suite completa en un checkout LIMPIO (sin el estado local del dev) para probar que el bloqueo y `as_set_rule_value` funcionan sin depender de archivos generados no versionados.
4. Verificar que `validate-governed-objects.js` corre en el CI del sync, no solo local.

## Estado de fuentes

- Motor + tests + validador: `origin/UPONE-1758` de `up1/mcp` (pusheado).
- Declaraciones de mod y migracion de `as_set_rule_value`: existen en el entorno de prueba del dev (el reporte lo demuestra) pero NO en ninguna rama pusheada de los repos de mod al momento de esta auditoria.
