---
id: DOC-kb-sp10-ANALISIS-blockGenericMutation-testing-1758-aporte
project: up1
type: doc
module: mcp
tags:
  - sp10
  - mcp
  - blockGenericMutation
  - UPONE-1758
  - seguridad
  - canonicalizacion
  - analisis
---

# Aporte del reporte de testing UPONE-1758 al mecanismo blockGenericMutation

Analisis de un reporte de testing de seguridad externo (artefacto compartido a la organizacion, autoria de otra persona, tratado como DATO) sobre el bloqueo de escritura generica del MCP. Titulo del reporte: "El bloqueo aguanta, pero antes se esquivaba con un guion bajo" (UPONE-1758, cinco baterias, 124 chequeos E2E contra el object-manager real). Este doc responde: que aporta al tema y que cambia respecto de `PLAN-blockGenericMutation-mcp` y `ANALISIS-blockGenericMutation-impacto-flujos`.

## 1. Cambio de premisa: el vector MCP ya esta implementado y testeado

El plan y el analisis de impacto asumian que `blockGenericMutation` no existia (verificado contra `git HEAD 7407b2d`, mainline). El reporte prueba que SI existe, implementado y testeado, en la rama `origin/UPONE-1758` (no mergeada al mainline; por eso el grep del mainline no lo encuentra). El bloqueo del reporte coincide con el diseño del plan: se evalua ANTES del preview, indexado por objectType, opt-in por contrato. O sea: la capa "por puerta" (intra-MCP) del Track 1 esta hecha, no por disenar.

## 2. Aporte NUEVO y critico: el bloqueo por string de objectType es evadible por canonicalizacion

Es lo que ni el plan ni el analisis de impacto tenian. El object-manager resuelve VARIOS strings distintos a la MISMA tabla Prisma, asi que bloquear por el objectType crudo deja puertas abiertas. El reporte hallo y cerro tres familias (39 vectores fijados como test de regresion):

- **Variacion de casing.** El object-manager baja la primera letra sin condiciones (`instance.resolver.js:4126/4939/5115`): `CompetencyNode` y `competencynode` y `COMPETENCYNODE` escriben la misma tabla. Cierre: normalizar la clave a minusculas en las dos puntas.
- **Proyecciones de nombre.** Un objeto se nombra tambien por su proyeccion de recordType (`rt__<RT>__<base>`) o de campos extendidos (`ext__<clientCode>__<base>`), ambas modelos Prisma reales; el delete ademas resuelve `rt__` al objeto base A PROPOSITO. Antes: 10 de 15 vectores escaparon, incluidos los 5 recordTypes de matriz de competencias y escala de desempeno. Cierre: el lookup prueba los alias pelando prefijos por segmentos `__`. El `clientCode` y el nombre del recordType son arbitrarios, no enumerables, por eso hay que pelar por segmento, no por lista.
- **Espacios y separadores de sobra.** `" CompetencyNode"`, tabs, `"__competencynode"`. Antes lo frenaba el backend por charset, no el bloqueo (dependencia fragil). Cierre: recortar el nombre y descartar separadores sobrantes antes de buscar.

Implicacion para nuestro diseño: cualquier implementacion de `blockGenericMutation` DEBE canonicalizar (pelar `rt__`/`ext__`, minusculas, trim) ANTES de comparar contra el set gobernado. El helper `getBlockedHint` del plan tiene que operar sobre el objeto canonico resuelto, no sobre el objectType literal que manda el llamador. Esto es requisito de correctitud, no una alternativa opcional.

## 3. Confirma y concreta el Track 2 (cierre por invariante, cross-client)

El reporte reafirma nuestra separacion de capas. Pendiente #1 del reporte, textual en sustancia: "El bloqueo es por puerta, no por invariante. Vive en el proceso del MCP. El bulk-edit generico del core, la UI del Suite y un GraphQL directo siguen llamando a las mismas mutations, y el `deleteBulkInstances` del object-manager acepta los mismos nombres `rt__` que esta prueba uso como vector. El cierre integral es escalarlo al resolver generico, y esta redactado como ticket de ajuste."

Aporta un vector concreto que no teniamos: `deleteBulkInstances` del object-manager acepta los mismos `rt__`. Confirma que el cierre real es a nivel resolver (nuestro Track 2 / Core Extension) y que ya hay ticket de ajuste redactado.

## 4. Confirma el hueco silencioso del opt-in (nuestra decision abierta #1 del Track 1)

Pendiente #2 del reporte: "Los otros dos mods no declararon postura. El chequeo de completitud del sync es opt-in por pack, asi que un objeto gobernado sin declarar en curriculum-design o academic-scheduling sigue siendo un agujero silencioso. Es el criterio de entrada de UPONE-1757." Coincide exactamente con el riesgo del opt-in puro que motivaba la Opcion C (gate de completitud). Dato accionable: ya existe un chequeo de completitud del sync, pero es opt-in por pack; volverlo obligatorio (o gate de CI) es justamente la Opcion C.

## 5. Cross-valida la auditoria N0/N1

El comportamiento runtime del reporte confirma la auditoria: curriculum-design (Activity, planEntry) y academic-scheduling escriben por el generico y NO se bloquean (correcto, son N0/constraint); los objetos de curriculum-mapping estan gobernados y se rechazan con mensaje de negocio. La regresion objeto por objeto no encontro sobre-bloqueo. `as_set_rule_value` da preview sin escribir y sigue siendo el unico caso de mod que escribe por el generico (coincide con nuestro hallazgo de que el bloqueo no lo atrapa).

## 6. Lo que el reporte NO cubre y nuestro analisis SI aporta

El reporte no menciona la opcion de declarativizar invariantes a `core_ObjectValidation` o a constraints de Postgres para volverlos N0 cross-client (nuestro refinamiento del Track 1). Son complementarios: el reporte endurece la capa "por puerta" (canonicalizacion) y prueba el vector bulk; nuestro analisis aporta que, regla por regla, lo declarativizable conviene subirlo a la capa inbypasseable en vez de solo bloquear el MCP.

## 7. Angulos adyacentes del reporte (fuera de nuestro tema, mismo esfuerzo 1758)

- Transporte HTTP: fuga de stack trace (HTTP 500 con rutas de disco) ante token mal formado sin credencial, cerrado mapeando la etapa de credencial a 401. Descubrimiento OAuth verificado.
- Superficie de ruteo: 5 hallazgos de vocabulario (termino duplicado, "curriculum map" reclamado por dos mods, cobertura de vocabulario en espanol baja, un pedido cuyo unico enganche lexico apunta al mod equivocado). Ninguno del bloqueo; dos son decisiones de producto.

## 8. Sintesis: si aporta, y como se integra al plan

Aporta sustancialmente. No propone una arquitectura distinta (valida nuestra doble capa puerta/invariante), pero agrega una dimension de correctitud que faltaba (canonicalizacion/alias), concreta el vector bulk del Track 2, y confirma el hueco del opt-in del Track 1. Ajustes al plan: (a) agregar canonicalizacion como requisito duro del helper de bloqueo; (b) sumar el vector `deleteBulkInstances` al alcance del cierre por resolver; (c) tratar el chequeo de completitud del sync (hoy opt-in) como candidato a gate obligatorio; (d) mantener nuestra recomendacion de declarativizar lo declarativizable, que el reporte no contempla. Fuente de implementacion: rama `origin/UPONE-1758`.
