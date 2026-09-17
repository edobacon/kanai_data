---
id: BUG-object-manager-extended-fields-routing-UPONE-1775
project: up1
type: bug
module: object-manager
---

join/configDir/readFile nunca se importaron en el bloque de ruteo de campos extendidos de createInstance, lanzando un ReferenceError enmascarado como 'join is not defined'. Que readFile estuviera indefinido tambien significaba que el schema extendido nunca cargaba, por lo que la deteccion de FK para campos extendidos nunca funcionaba. Ahora un campo sin schema base ni extendido devuelve un error de validacion claro en vez de descartarse en silencio cuando no existe modelo ext__ para el tenant/objeto.

**sourceRef:** d134000e + src/graphql/resolvers/instance.resolver.js.
