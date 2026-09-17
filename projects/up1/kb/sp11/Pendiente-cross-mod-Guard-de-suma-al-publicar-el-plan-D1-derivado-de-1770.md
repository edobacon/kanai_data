---
id: DOC-kb-sp11-Pendiente-cross-mod-Guard-de-suma-al-publicar-el-plan-D1-derivado-de-1770
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp11
  - curriculum-mapping
  - curriculum-design
  - UPONE-1770
  - cross-mod
  - pendiente
  - guard-publicacion
  - D1
  - core-extension
  - alternativas
  - escala-decision
  - propuesta-A
---

# Pendiente cross-mod - Guard de suma al publicar el plan (D1, derivado de 1770)

Trabajo cross-mod que **sale de UPONE-1770 y queda por crear como ticket propio**, coordinado con curriculum-design. Es el unico punto cross-mod real del caso de tributacion (todo lo demas de 1770 es cm-interno). Ver `UPONE-1770 - cierre de alcance y correcciones`.

> **Estado de este documento.** Version ampliada (sp11): a los tres caminos originales se agrega un **cuarto** (D, condicion declarativa + bandera derivada), una **escala de recomendacion** con el porque de cada opcion, evidencia de codigo verificada, una seccion de **limites y preguntas abiertas por opcion** (que falta para pasar de decision a spec), y la **opcion A desarrollada a grado propuesta**. Todo lo tecnico esta contrastado contra los repos (referencias al final).
>
> **Nivel de madurez.** El doc esta a **nivel decision de direccion** (elegir A/B/C/D y escribir el ticket), y ademas lleva la opcion recomendada (A) a **grado propuesta**. Las opciones B/C/D siguen a nivel decision, no spec: ver "Limites de este documento".

## El caso, en llano

Cuando alguien **publica** un plan de estudios (lo pasa de `Approved` a `Active`), el sistema debe **negarse** si algun grupo de peso no suma 100 (grupos con `courseAggregationMode = Max` eximidos; criterios y resultados de aprendizaje siempre suman 100). Es **requerimiento verificado del PO**, no artefacto: esta en su maqueta, en su plan de division (`UPONE-1756-plan-po`: "validacion de suma 100 por grupo al publicar el plan") y en la descripcion de Jira de 1770.

La dificultad no es la regla, que es simple. Es **donde vive cada pieza**:

- **El dato y la regla** (los pesos, que grupo suma cuanto, la exencion `Max`) viven en **curriculum-mapping** (cm), en el objeto `CompetencyAlignment`.
- **El momento de la publicacion** (la transicion del plan a Vigente) vive en **curriculum-design** (cd). El plan (`Curriculum`) es un objeto de cd.

O sea: una regla cuyo *conocimiento* pertenece a un mod, pero cuyo *momento de aplicacion* pertenece a otro. Ese desajuste es todo el caso. Es el patron general de la pregunta "esto se maneja entre mods o hay que tocar el core".

### Tres conceptos base (para que las alternativas se entiendan)

1. **Transicion gobernada.** El estado del plan es un campo con maquina de estados declarada: solo ciertos saltos estan permitidos. El core los valida en `enforceEnumTransitions`, que mira *de donde a donde* vas y *si tenes permiso*, pero **NO** mira el contenido del registro. Es un portero que revisa el boleto, no el equipaje.
2. **Hook (punto de enganche).** Un lugar previsto en el core donde un mod cuelga logica para que corra en un momento dado. Verificado: **el core no tiene ninguno** para reglas de negocio (cero hits para `registerHook|preWrite|writeGuard|beforeMutation` en `object-manager/src`). Si queres que algo corra en la escritura, interceptas la mutacion entera; no hay gancho.
3. **Dependencia ciclica.** cm ya depende de cd (lee `planEntry`/`Curriculum`). Si ahora cd lee cm, quedan **los dos dependiendo uno del otro** = ciclo. Fragil al orden de carga de mods y desaconsejado por el propio manual del mod (regla G-2).

## Por que es "el dificil" (asimetria verificada)

Hay una asimetria entre dos flujos parecidos:

- El **versionado** del plan **si** tiene hook en el core (`inheritRecordTypeExtensionOnVersion`). Por eso 1771 hace su cross-mod de forma limpia: se cuelga de ahi.
- La **publicacion** (transicion a Vigente) **no** tiene hook. El core la valida con `enforceEnumTransitions`, que solo mira arista + permiso.

Esa es la raiz: si la publicacion tuviera hook como el versionado, esto seria trivial. Como no lo tiene, la validacion hay que **inyectarla desde afuera del core**, y ahi aparece la tension cm/cd.

Refuerzo: cm ya resolvio este problema **dentro de si mismo**. Su `assertPublishable.js` valida la suma de pesos de una **matriz** al publicarla, interceptando **su propia** mutacion (`updateCompetencyMatrixValidated`) justo antes de delegar al core, precisamente porque "el motor de transiciones corre dentro del core, despues, y no acepta hooks de contenido". cm tiene el patron resuelto para *sus* objetos; lo que no puede es aplicarlo sobre un objeto *de cd*, del que no es dueno de la mutacion.

## Factibilidad tecnica confirmada (base de B y D)

**cd y cm comparten el cliente Prisma del tenant.** `CompetencyAlignment` (de cm) esta en el esquema Prisma compilado del tenant (`prisma/UPU/schema.prisma`), y cm ya accede a objetos de cd por el mismo cliente (`prisma.curriculum.findMany`). Consecuencias:

- **B es fisicamente posible:** cd puede leer `CompetencyAlignment` por Prisma (el modelo esta en su cliente), aunque hoy no lo haga.
- **D es fisicamente posible:** cm puede leer y escribir `Curriculum` por Prisma. Matiz: cm hoy solo **lee** objetos de cd; **escribir** un campo de `Curriculum` no tiene precedente en produccion (ver limites).

Esto **no** cambia el analisis de acoplamiento (B sigue creando el ciclo aunque sea posible), solo confirma que ninguna opcion esta bloqueada por falta de acceso a datos.

## Las cuatro alternativas

### A) Interceptores en el core

**Como.** Se cambia el core para que la mutacion, en vez de tener *un solo dueno reemplazable*, corra una **lista de interceptores** por objeto/operacion. cm registra "al publicar un plan, verifica la suma". Ni cd ni cm se llaman entre si: los dos le hablan al core. Diseno detallado en "Opcion A a grado propuesta".

**Donde vive.** El mecanismo en core (`object-manager`); el check concreto en cm (donde vive el conocimiento).

**Pros.** Rompe el ciclo de raiz. Es la **misma pieza** que ya piden otras dos deudas: G-2 (cerrar el bypass del CRUD generico) y D4 (paridad MCP del peso). Un cambio de core **cierra tres cosas de una vez** (D1 + G-2 + D4). Lectura siempre exacta (lee los pesos vivos al publicar).

**Contras.** Trabajo de **core**, no de mod; requiere coordinar con ese equipo. Clasifica como **Architecture change**, que exige **RFC** ademas del PR: el camino mas largo en proceso.

**Reversibilidad.** Media (aditivo: de campo reemplazable a lista; introducible sin romper consumidores).

### B) Guard acoplado dentro de cd

**Como.** El guard vive en cd, en el punto donde cd ya intercepta la publicacion, y **lee `CompetencyAlignment` de cm** por Prisma (espejando `assertPublishable.js`, pero desde el otro lado).

**Donde vive.** Todo en cd. Hay lugar natural con **precedente**: cd ya intercepta todas las mutaciones de update y ya corre guards de contenido al publicar (p.ej. `assertActivityEvaluationsOnPublish`). El nuevo guard iria al lado.

**Pros.** Pragmatico y localizado. No toca core. Lectura exacta. Encaja con 1771.

**Contras.** **Crea el ciclo cm <-> cd** (hoy cd no lee ningun objeto de cm: verificado). Fragil al orden de carga. **No cierra el bypass** del CRUD generico (contra compartido por todo lo que no sea A).

**Reversibilidad.** Alta (un archivo en cd). El costo no es sacarlo, es que mientras este el ciclo condiciona a los dos mods.

### C) Indicador blando en cm (sin bloqueo duro)

**Como.** En vez de frenar la publicacion, la inconsistencia se expone como **indicador bloqueante del lado de cm** (1771 ya construye indicadores) y a lo sumo un aviso al publicar. No hay portero en el backend.

**Donde vive.** Todo en cm (UI).

**Pros.** Evita el ciclo y evita el core. Reusa lo que 1771 ya hace.

**Contras.** **Debilita la garantia**: un publish que no pase por la UI de cm (API, CRUD generico, MCP) no queda frenado. **Cambia el "no publica" del PO** a "aviso": es cambio de producto, requiere su OK explicito.

**Reversibilidad.** Alta, pero es la que menos cumple el requerimiento tal como esta escrito.

### D) Condicion declarativa + bandera derivada (nueva, no estaba en el doc)

**Como.** Las transiciones del core aceptan una **condicion-formula** (`conditions`, evaluada con FormulaJS sobre los campos del **propio** registro). Entonces: (1) cd agrega un campo al plan, p.ej. `weightsBalanced`; (2) cm, en cada guardado de pesos, **recalcula esa bandera y la escribe en el plan** (cm->cd es la direccion permitida; **no** crea ciclo de codigo: cd nunca llama a cm); (3) cd declara `"conditions": "weightsBalanced == true"` en la transicion `Approved -> Active`. El core hace el resto.

**Donde vive.** El campo + la condicion en cd (una linea en el JSON del plan); el calculo de la bandera en cm; el enganche ya lo tiene el core (no se toca).

**Pros.** Es **bloqueo duro** (a diferencia de C), **sin ciclo de codigo** (a diferencia de B) y **sin tocar core** (a diferencia de A). Usa un mecanismo del core ya existente y probado.

**Contras.** **Denormalizacion**: la bandera es dato derivado que puede quedar desactualizado; si algo modifica los pesos sin pasar por cm (el mismo bypass generico), la bandera "miente" y el gate deja pasar algo que no cierra. Una lectura viva (A o B) no tiene ese riesgo. Sigue siendo coordinacion cross-mod, por dato en vez de por codigo. La condicion del core solo lee campos del propio registro: no puede consultar otra tabla, por eso la suma tiene que estar **pre-calculada** en la bandera.

**Reversibilidad.** Media-alta (quitar la condicion es una linea; quitar la bandera implica limpiar el campo + el calculo en cm).

## Escala de recomendacion (mejor a peor) y por que

**Criterio de ordenamiento:** (1) cumple el requerimiento del PO tal como esta escrito (bloqueo duro), (2) no deja deuda de acoplamiento (ciclo) ni denormalizacion, (3) costo de proceso/coordinacion. La guia de frontera es explicita en que la decision core-vs-mod la toma el **juicio de genericidad** ("lo necesitaria otro mod?"), no las convenciones de codigo.

**1o - A (core). La mejor solucion "bien hecha".** Es la unica que no deja deuda: bloqueo duro + rompe el ciclo + lectura exacta. Y **amortiza su costo entre tres deudas** (D1 + G-2 + D4), lo que la vuelve la de mejor relacion costo/beneficio pese a ser trabajo de core. El mecanismo "lista de interceptores por transicion" **no es especifico de cm ni de tributacion**: cualquier mod que valide contenido en una transicion lo necesita, que es la definicion exacta de algo que pertenece al core. **Su unica dependencia real es el tiempo del equipo de core** (y el RFC). No se descarta; se prioriza y se acepta su ritmo.

**2o - D (declarativa + bandera). El mejor plan B si se necesita bloqueo duro YA.** Consigue el bloqueo duro sin ciclo de codigo y sin esperar a core. Se baja un escalon **solo** por la denormalizacion (la bandera puede mentir ante un bypass) y por la coordinacion cross-mod por dato. Es la opcion a elegir si la dureza es innegociable y el core no llega a tiempo.

**3o - B (acoplado en cd). Pragmatica, pero con la deuda que el manual pide evitar.** Cumple el requerimiento (bloqueo duro, lectura exacta) y tiene precedente, pero **paga con el ciclo cm<->cd** que G-2 desaconseja explicitamente. Se elige solo si se **acepta conscientemente** ese ciclo a cambio de rapidez y localidad, sabiendo que condiciona a los dos mods.

**4o - C (indicador blando). La ultima, porque cambia el requerimiento.** Es la mas barata en acoplamiento, pero **no cumple lo que pidio el PO** (pasa de "no publica" a "aviso") y **deja el gate sin garantia** (cualquier publish fuera de la UI de cm lo saltea). Solo entra en carrera **si el PO acepta explicitamente** degradar a aviso; sin ese OK, queda descartada por incumplir el requerimiento.

| Opcion | Bloqueo duro | Sin ciclo | Sin denormalizar | Sin tocar core | Cierra G-2 + D4 |
|---|---|---|---|---|---|
| A core | si | si | si | no | si |
| D declarativa | si | si (de codigo) | no | si | no |
| B acoplado cd | si | no | si | si | no |
| C indicador | no | si | si | si | no |

## Limites de este documento (que falta para pasar de decision a spec)

El doc alcanza para **elegir direccion y escribir el ticket**. **No** alcanza (salvo A, ver abajo) para entregarle la opcion elegida a un dev como spec sin un paso mas. Preguntas abiertas por opcion:

- **A (core):** resuelto a grado propuesta abajo. Queda para el RFC el cableado exacto (linea de `instance.resolver.js` donde se corre la lista, y la coexistencia con el override de `updateInstance` de cd).
- **B (cd):** falta la **query exacta** (group by por `(planId, competencyNodeId, developmentLevelId)`, filtro `Evaluates`/`Both`, exencion `Max`) y **como detecta el guard que la mutacion es un publish** (comparar `old.status != Active && new.status == Active`, como hace cm en `competencyMatrix-update.resolver.js`). Acceso a datos ya confirmado.
- **C (indicador):** falta **donde** en 1771 vive el indicador, que consulta lo alimenta, y que significa "bloqueante" en UI si el backend no enforza (es advisory por definicion).
- **D (declarativa):** (a) **cm escribir `Curriculum` no tiene precedente en produccion** (solo lo lee): hay que definir el punto transaccional (que resolver de cm recalcula y escribe la bandera en el mismo commit que los pesos); (b) **agregar el campo `weightsBalanced` es tarea de cd, no de cm**, o sea que D tambien toca dos mods; (c) confirmar que el campo es base (no `ext__`) para que `conditions` lo lea (una `conditions` sobre un `ext__` puede no resolver desde el path base; ver `enum-transitions.md`).
- **Transversal:** falta **estimacion de esfuerzo** por opcion. Cualitativo: A = mecanismo core chico-mediano + guard cm chico + tests, pero el palo largo es proceso (RFC + core). D = campo cd chico + calculo cm mediano (transaccional) + condicion. B = un guard cd chico-mediano. C = UI de indicador (depende de 1771). El palo largo de A es coordinacion, no codigo.

## Opcion A a grado propuesta (diseno del interceptor)

Diseno minimo que satisface la escala. Es lo que G-2 pide literalmente: que los campos de mutacion del core corran una **lista de interceptores** en vez de ser **un campo reemplazable** que gana el ultimo mod que lo declara.

### El problema estructural que resuelve

Hoy `Mutation.updateInstance` (y `create`/`delete`) es **un solo campo**. El core spread `...dynamicResolvers.mutations` **al final**, asi que **el ultimo mod que lo declara gana** y deja mudo a cualquier otro (verificado en el encabezado de `polymorphicUpdate.resolver.js`: cd ya se apropia de `updateInstance` para todo el server). Consecuencia: un segundo mod que quiera validar en esa mutacion no tiene lugar. La lista de interceptores rompe el "gana el ultimo": el core corre **todos** los interceptores registrados, en orden, y cada uno puede abortar.

### API propuesta (forma, no verbatim)

Registro (nuevo modulo del core, p.ej. `src/services/mutations/interceptor-registry.js`):

```js
registerMutationInterceptor({
  object: 'Curriculum',
  op: 'update',                                   // create | update | delete
  when: { field: 'status', from: 'Approved', to: 'Active' }, // opcional: acota a una transicion
  run: async ({ prisma, context, oldRecord, incomingValues, effectiveRecord }) => {
    // lanza personalisedError si no cumple; no devuelve nada si esta OK
  },
});
```

cm lo registra en su carga (mod-owned), reusando la logica que ya tiene:

```js
registerMutationInterceptor({
  object: 'Curriculum', op: 'update',
  when: { field: 'status', from: 'Approved', to: 'Active' },
  run: (ctx) => assertPlanWeightsBalanced(ctx),   // lee CompetencyAlignment por planId, agrupa, exime Max
});
```

### Donde se cablea en el core

- **Posicion:** misma que `enforceEnumTransitions`, es decir **despues de auth y antes de `prisma.update()`**, en los **dos** caminos de escritura de `instance.resolver.js` (path base y early-return de RecordType). El interceptor corre **despues** de que `enforceEnumTransitions` valido que la arista existe y el permiso alcanza (no tiene sentido validar contenido de una transicion prohibida).
- **No via `onTransition`:** ese evento se emite **despues** de la escritura y es fire-and-forget (BullMQ); no puede abortar. El guard tiene que ser **pre-escritura**, como `enforceEnumTransitions`.
- **Coexistencia con el override de cd:** el registro es **aditivo**. cd puede seguir con su override de `updateInstance`; el core corre la lista de interceptores dentro del flujo generic al que cd delega. (El RFC fija el punto exacto para que el interceptor corra tanto por el path generic como por el early-return RT.)

### Alcance que cierra (por que rinde)

- **D1:** cm registra el guard de suma en la transicion de publicacion del plan. Lectura viva, bloqueo duro, sin ciclo.
- **G-2:** el mismo registro por `op: create|update|delete` cierra el **bypass del CRUD generico** del mod (hoy imposible sin core), y cubre `delete` (que `core_ObjectValidation` no cubre).
- **D4:** con el guard corriendo en el server para toda puerta (UI, API, MCP), la **paridad MCP del peso** deja de necesitar duplicar la regla.

### Change Type y contenido del ticket

Por la guia de frontera, esto es un **Architecture change** (redisenio interno del core para reuso) => **RFC + PR**. El ticket de Core Extension debe abrir con descripcion funcional en lenguaje llano y luego la plantilla de **Resolver**:

- **Mutation esperada:** ninguna nueva; se altera el contrato interno de `create/update/deleteInstance` para correr una lista de interceptores registrados.
- **Caso de negocio:** validar contenido en una transicion/escritura desde el mod dueno del conocimiento, sin ciclo cross-mod ni "gana el ultimo".
- **Por que el CRUD generico no lo expresa:** el generic solo valida forma/enum/arista/permiso; no corre reglas de negocio del mod, y `core_ObjectValidation` no corre en transiciones ni cruza tablas ni cubre delete.
- **Test cases (rule 13):** happy = publicar un plan con todos los grupos en 100 procede; error = un grupo en 80 aborta con el error personalizado; borde = grupo `Max` eximido publica; regresion = dos interceptores sobre el mismo objeto corren ambos (no "gana el ultimo").

### Esqueleto de RFC

1. **Problema:** el core no tiene punto de validacion de negocio pre-escritura; el campo de mutacion tiene dueno unico; hay 3 casos que lo necesitan (D1, G-2, D4).
2. **Propuesta:** registry de interceptores por `(object, op[, when])`, corridos en orden pre-escritura en ambos paths de `updateInstance` (+ create/delete).
3. **API:** `registerMutationInterceptor(...)` (arriba) + firma del `run`.
4. **Cableado:** puntos en `instance.resolver.js`; interaccion con `enforceEnumTransitions` (corre despues) y con overrides de mod existentes (aditivo).
5. **Migracion:** aditiva, sin romper consumidores; los overrides actuales siguen validos.
6. **Alternativas descartadas:** override por mod (gana el ultimo, G-2), `core_ObjectValidation` (no transiciones, no cross-table, no delete), guard acoplado en cd (ciclo).
7. **Tests + rollout.**

### Estimacion (cualitativa)

- **Core:** registry + cableado en dos paths + tests = **chico-mediano**.
- **cm:** el guard es casi gratis (reusa `assertPublishable`/`readMatrixTree` adaptado a `CompetencyAlignment` por plan) = **chico**.
- **Palo largo:** RFC + revision/aprobacion del equipo de core = **proceso, no codigo**. Es la variable que domina el calendario, no la dificultad tecnica.

## Plan propuesto (desacoplar decision de bloqueo)

**Fase 0 (hecho).** 1770 se ejecuta cm-interno sin este guard. No lo bloquea.

**Fase 1 - Decision de producto (PO).** Una pregunta de cortesia que define el resto: **bloqueo duro (el plan no publica) o aviso fuerte?** La maqueta lo dibuja como indicador; "se valida al publicar" se lee como gate. Si acepta "aviso", **C** entra en juego; si exige "no publica", quedan A/D/B en ese orden.

**Fase 2 - Decision tecnica (dueno de cd + core).** Con la dureza definida, elegir con la escala de arriba. Recomendacion: **A** si el core lo puede tomar en horizonte razonable; **D** como plan B para bloqueo duro inmediato; **B** solo si se acepta el ciclo.

**Fase 3 - Crear el ticket** (PO/lead en Jira, coordinado con el dueno de cd). Si es **A**, es una **Core Extension tipo Architecture change** con el contenido de arriba, redactado para que **cierre tambien G-2 y D4**.

**Fase 4 - Implementacion** (segun opcion):
- **A:** RFC del interceptor-list en core + check de cm registrado contra la transicion del plan (espejar `assertPublishable.js`).
- **B:** guard en cd al lado de `assertActivityEvaluationsOnPublish`, leyendo `CompetencyAlignment`.
- **D:** campo `weightsBalanced` en el plan (cd) + calculo transaccional en cm + `conditions` en la transicion.

**Scope del grupo (comun):** `(planId, competencyNodeId, developmentLevelId)`, solo `Evaluates`/`Both` (R-6). Exencion por `courseAggregationMode = Max`.

**Validacion (cualquier opcion):** publicar un plan con un grupo que no suma 100 y verificar rechazo (o aviso, si C); y otro con exencion `Max` que verifique que si publica.

## Estado

- **Pendiente:** decidir dureza con el PO (Fase 1), decidir enfoque con cd + core (Fase 2), crear el ticket (Fase 3).
- **No bloquea 1770:** 1770 se ejecuta cm-interno sin esto.
- Si se va por A, ese ticket de core tambien cierra la deuda de paridad MCP del peso (D4) y el bypass del CRUD generico (G-2).

## Referencias (evidencia verificada)

- **Motor de transiciones sin hook de contenido:** `curriculum-mapping/logic/helpers/assertPublishable.js` (encabezado: "Lo unico que corre en la transicion es `enforceEnumTransitions` del core ... jamas mira el CONTENIDO del registro"). Core: `object-manager/src/graphql/resolvers/instance.resolver.js` (`enforceEnumTransitions`, corre despues de auth y antes de `prisma.update()`), `docs/enum-transitions.md`.
- **Core sin registry de hooks:** verificado en la regla G-2 (`curriculum-mapping/CLAUDE.md`): cero hits para `registerHook|preWrite|writeGuard|beforeMutation` en `object-manager/src`; el unico enganche por objeto son las validaciones declarativas `core_ObjectValidation`, que **no** corren en transiciones y **no** cruzan tablas ni cubren delete.
- **"Gana el ultimo" en el merge de resolvers:** encabezado de `curriculum-design/logic/polymorphicUpdate.resolver.js` (el platform spread `...dynamicResolvers.mutations` al final; el mod gana sobre el generic). cd intercepta todo update y ya valida contenido al publicar (`assertActivityEvaluationsOnPublish`); cd hoy **no** lee ningun objeto de cm.
- **Prisma compartido (base de B/D):** `object-manager/prisma/UPU/schema.prisma:1095` (`model CompetencyAlignment`); cm ya usa `prisma.curriculum.findMany` (accede a objetos de cd por el mismo cliente).
- **Condicion declarativa en transiciones (base de D):** `object-manager/docs/enum-transitions.md` (campo `conditions`, evaluado con FormulaJS sobre los campos del registro; `requiredCapabilities`; `onTransition` es post-escritura y fire-and-forget, no puede abortar).
- **Transicion de publicacion del plan:** `curriculum-design/objects/Curriculum.json:130` (`{ from: "Approved", to: "Active", requiredCapabilities: ["curriculum:publish"] }`).
- **Formato del ticket de Core Extension y Change Types:** `object-manager/docs/guides/core-mod-boundary-workflow.md` (Change Type "Architecture change" = RFC + PR; plantilla "Resolver": mutacion esperada, caso de negocio, por que el CRUD generico no lo expresa, test cases happy + error). La decision core-vs-mod la toma el juicio de genericidad de Aduana.
- **Contexto de origen:** `UPONE-1770 - cierre de alcance y correcciones` (sp11), `UPONE-1770-aduana` (fila #3), `UPONE-1756-plan-po`, maqueta. Regla G-2 (CLAUDE.md del mod). Deuda hermana: paridad MCP del peso (D4) y bypass del CRUD generico (G-2).
