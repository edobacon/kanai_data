---
id: DOC-kb-sp11-TICKET-D1-A-core-extension-registry-interceptores-mutacion
project: up1
type: doc
module: object-manager
tags:
  - sp11
  - core-extension
  - object-manager
  - UPONE-1770
  - D1
  - architecture-change
  - interceptores
  - draft-ticket
  - cross-mod
---

# Ticket A (Core Extension) - Registry de interceptores de mutación pre-escritura en Object Manager

> **BORRADOR para revisión.** Este es el ticket de Core Extension del corte de dos tickets que salda el D1 (guard de suma=100 al publicar el plan) y, por el mismo mecanismo, las deudas G-2 (bypass del CRUD genérico) y D4 (paridad MCP del peso). El **Ticket B** (mod, curriculum-mapping) consume este mecanismo. NO creado en Jira todavía. Análisis de frontera hecho con Aduana; el veredicto final lo da la triage del equipo de core.

## Ficha

- **Título:** Registry de interceptores de mutación pre-escritura en Object Manager
- **Origin:** mod `curriculum-mapping`, bloquea **UPONE-1770** (habilita el D1). Deriva del cierre de alcance de 1770 (D1 sale a ticket propio).
- **Reported by:** dev team `curriculum-mapping`, al scopear el D1 con Aduana.
- **Priority (Jira nativa):** **a confirmar** (propuesta: Media. Bloquea un criterio de aceptación de 1770, pero 1770 se ejecutó cm-interno sin esto; no hay incidente en producción).
- **Change Type:** **Architecture change** (redisenio interno del core para reuso) => RFC + PR.
- **Issue type en Jira:** stand-in a confirmar (el tipo "UP1 Feature" aún no existe; Entrega 3 del plan de frontera pendiente).
- **Labels:** `core-extension`.

## Descripción funcional (lenguaje llano)

Hoy, cuando un mod necesita **validar el contenido de un registro justo antes de que se escriba** (por ejemplo: "no dejes publicar este plan si los pesos de un grupo no suman 100"), el core no ofrece ningún punto de enganche para hacerlo. El motor de transiciones del core (`enforceEnumTransitions`) solo revisa que el salto de estado exista y que el usuario tenga permiso; nunca mira el contenido del registro. Es un portero que revisa el boleto, no el equipaje.

Además, el campo de mutación del core (`create/update/deleteInstance`) tiene **un solo dueño**: el core hace spread de los resolvers de mod al final, así que **el último mod que declara la mutación gana** y deja mudo a cualquier otro. Consecuencia directa: un segundo mod que quiera validar algo en esa mutación no tiene lugar donde hacerlo sin pisar al primero.

La propuesta es darle al core un **registro de interceptores**: cada mod puede registrar "cuando se haga esta operación sobre este objeto (y opcionalmente en esta transición), corré esta validación antes de escribir". El core corre **todos** los interceptores registrados, en orden, y cualquiera puede abortar la escritura con un error. El mod dueño del conocimiento pone la regla; ni los mods se llaman entre sí ni se toca su código: todos le hablan al core.

Esto no es específico de tributación ni de curriculum-mapping: **cualquier mod que necesite validar contenido en una escritura o transición lo necesita**, que es la definición de algo que pertenece al core. El mismo mecanismo cierra tres necesidades hoy abiertas:

- **D1** (curriculum-mapping): bloquear la publicación de un plan si un grupo de pesos no suma 100 (grupos con `Max` eximidos). Lectura viva, bloqueo duro, sin ciclo entre mods.
- **G-2** (curriculum-mapping): el mismo registro por `create|update|delete` cierra el bypass del CRUD genérico del mod, y cubre `delete` (que `core_ObjectValidation` no cubre).
- **D4** (curriculum-mapping): con el guard corriendo en el server para toda puerta (UI, API, MCP), la paridad MCP del peso deja de necesitar duplicar la regla.

## Técnico (RFC Template)

```
# RFC: Registry de interceptores de mutación pre-escritura en Object Manager

## Problema
El core no tiene un punto de validación de negocio pre-escritura, y el campo de mutación
tiene dueño único.

1. enforceEnumTransitions (object-manager/src/graphql/resolvers/instance.resolver.js) valida
   la transición mirando SOLO arista + permiso; jamás mira el contenido del registro.
2. core_ObjectValidation (el único enganche declarativo por objeto) NO corre en transiciones,
   NO cruza tablas y NO cubre delete.
3. onTransition se emite DESPUÉS de la escritura y es fire-and-forget (BullMQ): no puede abortar.
4. Mutation.updateInstance (y create/delete) es un solo campo; el core hace spread de
   ...dynamicResolvers.mutations al final, así que el último mod que lo declara gana
   (verificado en el header de curriculum-design/logic/polymorphicUpdate.resolver.js: cd ya se
   apropia de updateInstance para todo el server). Un segundo mod que quiera validar ahí no
   tiene lugar.

Hay tres casos que necesitan esto hoy: D1 (guard de publicación del plan), G-2 (bypass del
CRUD genérico) y D4 (paridad MCP del peso).

## Propuesta
Un registry de interceptores por (object, op[, when]), corridos en orden, PRE-ESCRITURA, en los
dos caminos de escritura de instance.resolver.js (path base y early-return de RecordType),
DESPUÉS de auth y de enforceEnumTransitions y ANTES de prisma.update()/create()/delete().

API (forma, no verbatim), en un módulo nuevo del core
(p.ej. src/services/mutations/interceptor-registry.js):

  registerMutationInterceptor({
    object: 'Curriculum',
    op: 'update',                                              // create | update | delete
    when: { field: 'status', from: 'Approved', to: 'Active' }, // opcional: acota a una transición
    run: async ({ prisma, context, oldRecord, incomingValues, effectiveRecord }) => {
      // lanza personalisedError si no cumple; no devuelve nada si está OK
    },
  });

El core corre TODOS los interceptores registrados para ese (object, op) que matcheen el `when`,
en orden de registro, cada uno puede abortar. Rompe el "gana el último": ya no es un campo
reemplazable, es una lista aditiva.

## Alternativas consideradas
- Override por mod (lo actual): "gana el último", deja mudo al segundo mod (el problema que G-2
  pide cerrar). Rechazada.
- core_ObjectValidation declarativo: no corre en transiciones, no cruza tablas, no cubre delete.
  No alcanza para D1. Rechazada.
- Guard acoplado dentro de curriculum-design leyendo CompetencyAlignment de cm por Prisma
  (físicamente posible: comparten el cliente Prisma del tenant): crea el ciclo cm<->cd que
  la regla G-2 del mod desaconseja explícitamente. Rechazada por acoplamiento.
- Bandera derivada (cm calcula weightsBalanced y la escribe en el plan de cd + conditions
  declarativa en la transición): no toca core pero DENORMALIZA (la bandera puede quedar
  desactualizada ante un bypass) y sigue tocando dos mods. Rechazada por fragilidad.

## Impacto
Aditivo, sin romper consumidores. Los overrides actuales de mod (p.ej. el de updateInstance de
cd) siguen válidos y coexisten: el core corre la lista de interceptores dentro del flujo generic
al que cd delega. enforceEnumTransitions no cambia (el interceptor corre después). Ningún
consumidor existente ve un cambio de contrato externo.

## Plan de adopción
1. Registry + cableado en los dos paths de instance.resolver.js, con su suite de tests
   (incluye: dos interceptores sobre el mismo objeto corren AMBOS, no "gana el último").
2. curriculum-mapping (Ticket B) adopta el mecanismo: registra el guard de suma=100 contra la
   transición Approved->Active del Curriculum (espejando assertPublishable.js del propio mod),
   y sus interceptores de create/update/delete para cerrar G-2.

## Test cases (rule 13)
- happy: publicar un plan con todos los grupos en 100 procede.
- error: un grupo en 80 aborta con el error personalizado, el plan NO pasa a Activo.
- borde: grupo con courseAggregationMode = Max eximido, publica igual.
- regresión: dos interceptores sobre el mismo objeto corren ambos (no "gana el último").
```

## Coexistencia y punto de cableado (para el RFC)

- El interceptor corre en la **misma posición** que `enforceEnumTransitions`: después de auth y antes de `prisma.update()`, en los **dos** caminos de escritura de `instance.resolver.js` (path base y early-return de RecordType). El RFC fija la línea exacta y la coexistencia con el override de `updateInstance` de cd.
- **No** vía `onTransition` (post-escritura, fire-and-forget, no aborta). El guard tiene que ser pre-escritura.

## Referencias (evidencia verificada)

- `curriculum-mapping/logic/helpers/assertPublishable.js` (el mod ya resuelve este patrón para SUS matrices, interceptando su propia mutación porque el core no acepta hooks de contenido).
- `object-manager/src/graphql/resolvers/instance.resolver.js` (`enforceEnumTransitions`), `object-manager/docs/enum-transitions.md`.
- Regla G-2 en `curriculum-mapping/CLAUDE.md` (cero hits para `registerHook|preWrite|writeGuard|beforeMutation` en `object-manager/src`).
- `curriculum-design/logic/polymorphicUpdate.resolver.js` (header: "gana el último"; cd hoy NO lee ningún objeto de cm).
- `object-manager/prisma/UPU/schema.prisma:1095` (`model CompetencyAlignment`, base de la factibilidad).
- `curriculum-design/objects/Curriculum.json:130` (transición `Approved -> Active`, `requiredCapabilities: ["curriculum:publish"]`).
- Formato y Change Types: `object-manager/docs/guides/core-mod-boundary-workflow.md`.
- Origen del análisis: `Pendiente cross-mod - Guard de suma al publicar el plan (D1, derivado de 1770)` (sp11, opción A a grado propuesta), `UPONE-1770 - cierre de alcance y correcciones` (sp11).

## Decisiones previas que gobiernan este ticket

1. **Producto (PO):** el texto de 1770 dice "la suma se valida al publicar", no dice "bloquea". Confirmar **bloqueo duro vs aviso**. Si el PO acepta aviso, este ticket de core es sobre-ingeniería para el D1 puntual (aunque sigue valiendo por G-2/D4).
2. **Técnica:** confirmada la opción A (core) sobre B/C/D. A es la única sin deuda estructural y amortiza el costo entre tres deudas.
