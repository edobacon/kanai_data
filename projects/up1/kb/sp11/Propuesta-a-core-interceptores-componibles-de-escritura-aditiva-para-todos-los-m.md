---
id: DOC-kb-sp11-Propuesta-a-core-interceptores-componibles-de-escritura-aditiva-para-todos-los-m
project: up1
type: doc
module: object-manager
tags:
  - sp11
  - core
  - object-manager
  - propuesta
  - interceptores-componibles
  - core-extension
  - camino-2
  - aditivo
---

# Propuesta a core: interceptores componibles de escritura (aditiva, para todos los mods)

Propuesta de sp11 para el equipo de core (object-manager). Objetivo: que varios mods puedan gobernar el mismo objeto en el CRUD generico sin pisarse, de forma 100% ADITIVA (nada de lo que cd o cm hacen hoy se rompe). Es el Camino 2 del documento de decision de cm y el cierre cross-client que el bloqueo del MCP (blockGeneric) no da. Verificado contra codigo real (file:line).

## 1. Problema que resuelve

Hoy `Mutation.createInstance/updateInstance/deleteInstance` tiene UN SOLO dueño en todo el server. Un mod override el campo entero; si dos mods overridean el mismo, el segundo pisa al primero SIN error ni warning, y ningun test lo detecta (cada mod prueba sobre su propio arbol de git).

Evidencia:
- El merge de resolvers es por `Object.assign`/spread de objetos, no por lista: `object-manager/src/graphql/resolverIndex.js` (`loadResolversFromDirectory` 25-68 recorre `*.resolver.js`; `loadDynamicResolvers` 73-88 combina `{ ...projectResolvers.mutations, ...modResolvers.mutations }` linea 86; merge final del bloque Mutation 109-123, `...dynamicResolvers.mutations` al final linea 122). `Mutation.createInstance` es una sola key: gana el ultimo que la escribe.
- Orden: `fs.readdirSync` recorre las carpetas de mod (en la practica alfabetico, NO garantizado por spec). `curriculum-design` precede a `curriculum-mapping`, asi que cm cargaria despues y ganaria, pero hoy solo cd registra los tres campos, asi que cd gana siempre.
- cd registra: createInstance en `sectionValidation.resolver.js:317`, updateInstance en `polymorphicUpdate.resolver.js:731`, deleteInstance en `requirementCategoryDelete.resolver.js:104`. Todos validate-then-delegate al generic via `loadGenericInstanceMutation`.
- Caso probado: cm intento su propio guard (commit `7972381`, `genericWriteGuard.resolver.js`) y lo revirtio un dia despues (`068ec91`) porque mataba silenciosamente los overrides de cd. El CLAUDE.md de cm (271-289) documenta 5 alternativas descartadas y concluye: la solucion es un Core Extension "que los tres campos corran una LISTA de interceptores en vez de ser un campo reemplazable".

## 2. Que existe hoy como enganche por objeto (y por que no alcanza)

Dentro del generic (`instance.resolver.js`), despues de auth y antes del write, ya corre `core_ObjectValidation` + `enforceEnumTransitions` (`instance.resolver.js:5546-5559`, 5572). Pero son reglas DECLARATIVAS (json-rules-engine leidas de la tabla `core_ObjectValidation`), no logica JS arbitraria de un mod, y no pueden RECHAZAR/reemplazar la escritura completa: el guard de cm necesitaba rechazar, no solo validar campos. Sirve de referencia del PUNTO donde iria el hook, no como el mecanismo.

Dato util: el core YA usa composicion de decoradores por funcion en otro nivel (`withEventPublish`/`withObjectAuth`/`withDataLog` anidados en `instance.resolver.js:4131-4132, 5024-5025, 5221-5222`; `withObjectAuth` en `src/services/auth/withAuth.js:219`). Un mecanismo de interceptores en lista encaja con un patron que el core ya usa.

## 3. Diseno propuesto (anclado en el codigo real)

**A. Registro (nuevo, aditivo).** Una estructura `(objectType|'*', operation) -> Array<interceptor>`, donde cada interceptor es `{ modId, phase: 'before', handler: async (ctx) => {...} }`. Un archivo nuevo del core (p.ej. `src/graphql/resolvers/writeInterceptors.js`) que exporta `registerWriteInterceptor(objectType, operation, handler)`. Cada mod se auto-registra en tiempo de import (mismo patron "el mod se carga y se registra" que ya existe), pero ACUMULANDO en una lista en vez de asignar una key.

**B. Componedor.** `runInterceptors(objectType, operation, args, context)`: busca los interceptores de `(objectType, operation)` mas los de wildcard `('*', operation)`, los corre en orden (registro o prioridad explicita para determinismo entre mods), corto-circuito si uno rechaza (equivale al `throw` de un override completo). Fail-closed: un error no capturado bloquea el write (es el camino de escritura; invariante roto = no escribir), igual que hoy un `throw` de un override.

**C. Punto de invocacion en el generic.** Dentro de cada uno de los tres resolvers, en la posicion que ya usa `core_ObjectValidation` (despues de auth, antes del write):
- createInstance: en el handler que arranca en `instance.resolver.js:4131`, tras validar objectType (4134-4136), antes de cualquier escritura: `await runInterceptors(objectType, 'create', {data}, context)`.
- updateInstance: donde hoy corre `core_ObjectValidation` (5540-5559).
- deleteInstance: antes de la cascada de borrado (5024-5025).

**Cambio minimo real:** para un MVP no hace falta tocar `resolverIndex.js`. El registro puede vivir en un archivo nuevo importado por `instance.resolver.js`, y cada mod llamar `registerWriteInterceptor(...)` desde su `*.resolver.js` al cargar. Passthrough total cuando no hay interceptores registrados: objeto sin interceptores = comportamiento byte-identico a hoy.

## 4. Aditividad: como NO choca con lo que cm ni cd hacen

Este es el corazon de la propuesta y tiene DOS decisiones de diseño abiertas que el equipo de core debe resolver antes de implementar (no las resuelve el codigo existente):

**(a) Convivencia con el override total de cd.** Un override TOTAL del campo (lo que cd hace hoy) bypassea el generic entero: si cd sigue dueño del campo, los interceptores del generic ni se ejecutan para esos objetos. Opciones: (i) cd migra gradualmente sus reglas de override total a interceptores puntuales (gana que el generic las corra TODAS, no solo las del que gane el slot); (ii) mientras no migre, el override de cd llama `runInterceptors(...)` en su primera linea antes de delegar, activando el mecanismo nuevo desde el override existente sin que el core sepa que cd sigue ahi. La migracion de cd es OPCIONAL y posterior; nada de cd se rompe si no migra. Decision de secuencia a acordar.

**(b) Las *Validated de cm llaman al generic como funcion JS.** `competencyMatrix-create.resolver.js:242` y afines llaman `generic.createInstance(parent, {objectType, data}, ctx)` como funcion importada (`loadGenericInstanceMutation`), NO como campo GraphQL. Por eso NUNCA pasan por el merge de `resolverIndex.js`. Si los interceptores corren DENTRO de la funcion generic, las *Validated de cm empezarian a disparar tambien los interceptores de otros mods sobre los mismos objetos. Puede ser deseable (mas gobernanza cross-client) o romper el supuesto "mis *Validated ya validaron todo, no quiero que otro mod interfiera". ESTE es el mayor riesgo de choque y merece decision explicita. Mitigacion natural: el mecanismo es opt-in por (objectType, operation); como hoy NINGUN mod registra interceptores sobre los objetos de cm, cm no se ve afectado hasta que alguien lo haga a proposito. La aditividad se mantiene con la regla "passthrough si no hay interceptor registrado".

**(c) Las *Validated y los overrides existentes no se tocan.** Son mutations GraphQL aparte (cm) u overrides de campo (cd) que siguen funcionando igual. El mecanismo nuevo solo agrega un punto de composicion; no reescribe nada.

## 5. Testing y sensibilidad

- Sensibilidad ALTA: es el camino comun de escritura de TODOS los objetos de TODOS los mods (`instance.resolver.js` createInstance/updateInstance/deleteInstance). Un bug ahi no se limita a un mod; como ya demostro cd/cm, un fallo silencioso no lo detecta ningun test de mod individual.
- Testing requerido: tests del componedor (orden determinístico, corto-circuito en el primer rechazo, aislamiento vs fail-closed, passthrough byte-identico sin interceptores); regresion de TODOS los overrides de cd (Modality, EvaluationComponent, Curriculum, RequirementCategory, Requirement, PlanEntry, CustomSection, Activity, Offering) probando que se componen igual; suite completa de object-manager + cd + cm en checkout limpio (multi-repo, sync primero). Hace falta un test de integracion a nivel object-manager que ejercite el merge real de `resolverIndex.js` con los mods sincronizados: hoy no existe para el escenario cross-mod, y es justamente el que habria cazado el caso cd/cm.
- Requiere sign-off del equipo dueño de object-manager. No es decision de un mod.

## 6. Que resuelve y que no

- Resuelve: gobernanza cross-client real (web, API, GraphQL directo, MCP, bulk-edit) sobre cualquier objeto con interceptor registrado; destraba el slot unico que hoy ata a cd; habilita que cm gobierne sus objetos sin depender solo del MCP. Con esto, el generic del MCP queda 1:1 para los objetos simples sin necesidad de tools bespoke.
- No resuelve por si solo: las operaciones COMPUESTAS de cm (arbol, matriz, adopcion) siguen necesitando tools de dominio (una escritura de arbol no es una fila generica). Ver el ticket de cm (Camino 1).

## 7. Esfuerzo (orientativo)

- Mecanismo (registro + componedor + 3 puntos de invocacion + tests del componedor): ~5 a 8 SP de core.
- Migracion opcional de cd a interceptores + regresion: adicional, se puede diferir.
- Alta sensibilidad, baja-media reversibilidad (cambio estructural). Pasar por la calibracion de SP del proyecto.

## 8. Notas de verificacion abiertas (para el equipo de core)
- El orden de `fs.readdirSync` no esta garantizado por spec; el mecanismo no debe depender de el para determinismo entre mods (usar prioridad explicita si hace falta orden).
- `mods/curriculum-design/docs/patterns/resolver-override.md` cita lineas de `resolverIndex.js` desactualizadas; usar las verificadas aca.
- No se verifico el repo fuente de curriculum-design (solo su copia sincronizada dentro de object-manager); re-confirmar file:line del mod si se citan en el reporte final a core.

Ver el ticket de cm (Camino 1) y el reporte del fix de blockGeneric (ambos sp11) para el contexto completo.
