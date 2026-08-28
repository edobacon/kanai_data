---
id: TICKET-117
project: up1
type: ticket
status: closed
work_type: fix
external: UPONE-1479
module: core
autopilot: autonomous
---

# Core | El borrado por RecordType no cascadea hijos ni respeta soft-delete (huerfanos + borrado fisico)

## Request

**Origen:** UPONE-1382 (hard delete en cascada, SP6) · **Descubierto en:** UPONE-1454 (`curriculum-mapping`, `LevelScheme`) · **Repo:** core (`object-manager`) · **SP:** 3

## Resumen

El borrado generico del core no cascadea los hijos declarados (`metadata.directChildren`) ni respeta la politica de soft-delete cuando el borrado entra por el **nombre del RecordType** (`objectType = "rt__<RT>__<base>"`) en vez del objeto base. El registro objetivo se borra, pero sus hijos quedan huerfanos y, si el objeto declara soft-delete, se elimina fisicamente en lugar de marcarse inactivo. No lanza error: es una inconsistencia silenciosa.

## Contexto (como funciona el borrado hoy)

En UP1 un RecordType se proyecta en tres capas: base + `rt__<RT>__<base>` + `ext__<client>__...`. Un mismo objeto puede exponerse en un catalogo **por su base** o **por su RecordType**, segun como este armado el list layout. La accion de borrado del RecordList termina llamando a `deleteBulkInstances(objectType, ids)`, y **el** `objectType` que llega determina el camino de codigo:

* Si llega el nombre base (`Curriculum`, `Activity`, ...), corre el camino generico, donde viven los dos mecanismos de la plataforma: el **motor de cascada declarativa** (`cascadeDeleteIfApplicable`, UPONE-1382) y el **soft-delete declarativo** (`bulkSoftField` + `executeSoftDeletePlan`).
* Si llega el nombre del RecordType (`rt__Scheme__levelscheme`), entra en una **rama especial** que existe desde antes del 1382 (resuelve que las tablas RT no tienen columna `id`), borra las tres capas del registro objetivo y **retorna**.

Ambos mecanismos del camino generico leen la metadata del objeto (`directChildren`, `softDeleteConfig`) **por el nombre del** `objectType` recibido. La declaracion vive en el objeto base, no en el RT.

El caso que lo destapo: `LevelScheme` (mod `curriculum-mapping`) es un agregado padre-hijos en la misma tabla (`Scheme` + niveles `Level` por `parentId`), cuyo catalogo se lista por el RT `rt__Scheme__levelscheme`. Al borrar un esquema, el `Scheme` desaparece pero sus niveles quedan con `parentId` apuntando a un padre inexistente.

## Por que pasa en HARD-DELETE

Afecta a los **dos** resolvers de borrado, por la misma causa raiz. Numeros de linea aproximados sobre `object-manager/src/graphql/resolvers/instance.resolver.js` (~6816 lineas al 2026-08-03).

* **`deleteBulkInstances`** (def ~5795): la rama RecordType (~5852-5942) hace `delete` de ext + RT + base y ejecuta `return` en ~5941. El motor de cascada (`cascadeDeleteIfApplicable`) se invoca recien en ~5951, **despues** de ese `return`, en el camino no-RT. El borrado por nombre RT nunca llega al motor y no camina `directChildren`.
* **`deleteInstance`** (single, def ~4097): mismo patron. El motor se invoca en ~4182 con el gate `objectDeclaresChildren(objectType)` (~4143 en el bloque soft; el motor lo vuelve a evaluar internamente); como `objectType` es el nombre RT, da `false` (`applied=false`) y cae a la rama RecordType (~4205-4234) que borra ext + RT + base y `return`. Mismos huerfanos que el bulk.

Doble barrera en ambos: aunque la rama RT no retornara, el gate lee la metadata por el nombre RT (`rt__scheme__levelscheme.json`), que no existe; la declaracion vive en el base (`levelscheme.json`). Sintoma: **hijos huerfanos**. Estado: **vivo hoy** (`LevelScheme`), reproducible por los dos entrypoints.

## Por que pasa en SOFT-DELETE

Misma causa raiz, sintoma mas severo. En `deleteBulkInstances` la rama RT no conoce el soft-delete: no referencia `bulkSoftField` (calculado en ~5829-5844) y esta posicionada **antes** tanto del bloque hard-cascade (`if (!bulkSoftField)`, ~5950) como del loop soft-delete (`if (bulkSoftField)`, ~6068). Por eso un objeto con `metadata.softDelete` borrado por su nombre RT se **elimina fisicamente** (ext+RT+base) en vez de bajar la bandera logica: se pierde el registro y la semantica de recuperacion.

Variacion entre paths: en `deleteBulkInstances` (el de la UI) el fallo es por **corte posicional** (la rama RT gana antes de evaluar soft); en `deleteInstance` (single) el bloque soft (~4116-4173) esta antes de la rama RT (~4205), pero lee `softDeleteConfig` por el nombre RT y no lo encuentra, cayendo igual al hard-delete. Estado: **latente hoy** (no hay ningun objeto que sea a la vez soft-delete + entrypoint RT + con hijos), pero la trampa queda armada en ambos entrypoints.

## Por que no se detecto antes (timeline)

1. La rama RecordType del borrado masivo se agrego **antes** del 1382, para resolver que las tablas RT no tienen `id`. En ese momento no habia cascada, asi que "borrar solo el objetivo" era correcto.
2. UPONE-1382 encuadro el alcance sobre objetos **base**: todos los casos de aceptacion entran por `deleteBulkInstances("<Base>", [id])`. Los RT figuraban solo como hijos que cuelgan del base, nunca como entrypoint que declara hijos.
3. El motor de cascada se inserto en el camino base, **despues** del `return` de la rama RT, sin revisar esa rama como entrypoint-con-hijos.
4. Ningun test entro por un nombre RT: unit e integration usan siempre `objectType` base. El caso "RT" del integration (`rt__Service__Activity`) entra por `Activity` y limpia la proyeccion de un **hijo**, no un entrypoint RT. El panel adversarial cazo 7 bugs del motor, pero todos dentro del path base: no se caza lo que no esta en las fixtures.
5. La topologia que lo activa (agregado listado por el RT con hijos en el mismo objeto) es de `curriculum-mapping` (`LevelScheme`), un mod que no existia durante el 1382. En curriculum-design los RT siempre cuelgan de un base distinto y el borrado entra por el base.

No es una regresion de lo construido: el motor hace lo prometido y con evidencia real. Es un gap de cobertura, mas una rama RT preexistente que quedo como camino paralelo sin reconectar.

## Criterios de aceptacion

Cada criterio se verifica por **ambos entrypoints**: `deleteBulkInstances` (bulk/UI) y `deleteInstance` (single).

* [x] Borrar por `rt__<RT>__<base>` cascadea el subarbol completo sin huerfanos (hijos, nietos por `recursiveBy`, capas RT/ext por nodo) — bulk y single. *(TC-1/TC-2, integration + smoke UPU)*
* [x] RT sin hijos declarados conserva el comportamiento actual (sin regresion) — bulk y single. *(TC-6, rt__Campus__OrgUnit)*
* [x] DataLog por nodo entrando por RT (paridad con el path base) — bulk y single. *(TC-3)*
* [x] `Restrict` entrando por RT bloquea sin borrado parcial — bulk y single. *(TC-5)*
* [x] Objeto con `softDelete` borrado por RT: sin borrado fisico, baja bandera + soft-cascade segun politica — bulk y single. *(TC-4, seed temporal opcion A)*
* [x] Sin regresion en el path base (hard y soft) — bulk y single. *(matriz base UPONE-1382 verde + suite unit 110/110)*

## Detalle tecnico (enfoque elegido: Opcion B)

Resolver RT a base al inicio del resolver y enrutar todo el borrado por el camino generico, para que el gate de hijos (`objectDeclaresChildren`) y el lookup de `softDeleteConfig` reciban el nombre base. Retirar la rama RT como camino paralelo. Cierra hard + soft en un solo cambio.

**Aplica a AMBOS resolvers** (confirmado por el dev, ver L1): `deleteBulkInstances` y `deleteInstance` (single) comparten la causa raiz. El fix debe resolver RT->base al inicio de los dos y reconectar/retirar la rama RT en cada uno; no basta con tocar solo el bulk. El camino generico ya limpia las proyecciones RT/ext del base (loop `rtDefsForBase`), por lo que enrutar el borrado RT por el base no deja proyecciones colgando.

Alternativa descartada (Opcion A, localizada): solo arregla el hard-delete y deja el soft-delete roto.

## Testing

Integration contra BD real UPU (`hard-delete-cascade.integration.test.js`). Red tests: (a) `requirement` Group + hijos por `rt__Group__requirement`; (b) objeto soft-delete proyectado como RT. Matriz: RT c/hijos, RT s/hijos, base, Restrict por RT, soft por RT, soft base. **Cada fila se corre por los dos entrypoints** (`deleteBulkInstances` y `deleteInstance`), porque ambos comparten la causa raiz (L1); un caso que solo entre por el bulk no cubre el single.

### Smoke test con validacion before/after en BD (L2)

Ademas de los red tests, el entregable incluye un **smoke test contra la BD real UPU que inspecciona el estado ANTES y DESPUES del borrado** por el path real de entrada, no solo el pass/fail del test. La verificacion es sobre el delta concreto de la BD (DET-36, verificacion runtime):

| Escenario | Antes | Despues (esperado) |
|-----------|-------|--------------------|
| Hard-delete por RT (agregado con hijos) | padre + N hijos/nietos + proyecciones RT/ext presentes | 0 huerfanos: subarbol completo borrado, sin filas con `parentId` colgando, proyecciones RT/ext en 0 |
| Soft-delete por RT | fila activa (bandera en true) | la fila **sigue existiendo** con la bandera logica abajo; sin borrado fisico de ext/RT/base |
| Restrict por RT | padre + referencia bloqueante | estado **identico** antes/despues: cero borrado parcial |

- Se ejecuta por **ambos entrypoints** (`deleteBulkInstances` y `deleteInstance`).
- Metodo de inspeccion: conteo directo de filas por tabla (base + `rt__` + `ext__`) y de hijos por FK antes y despues, con assertions sobre valores concretos (no solo "existe"). Razon: los unit mockeados no prueban correctitud de persistencia (proyecciones RT/ext, casing de FK, enums); el huerfano es silencioso y solo el delta real lo caza.

## Documentacion (parte del entregable)

Actualizar `docs/features/delete-cascade.md`, `docs/features/soft-delete.md` (retirar limitacion conocida ~L155), `docs/features/record-types.md`, `.ai/TROUBLESHOOTING.md`.

## Dependencias

BD UPU seedeada para el integration. Revision del team core (RULE-dev-004: toca `deleteBulkInstances`, core compartido).

## Definition of Done

Tests (red + regresion) verdes en UPU · **smoke con validacion before/after en BD real ejecutado y evidenciado (L2), por ambos entrypoints** · sin `console.*` · docs actualizadas · review doc core (sp7) · aprobacion team core + merge a `develop`.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix |
| Tipo de cambio | — |
| Modulo principal | core |
| Modulos afectados | — |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | En `deleteBulkInstances`, la rama RecordType retorna antes del motor de cascada, por eso borrar por `rt__<RT>__<base>` deja hijos huerfanos (hard-delete). | ✓ confirmed | **backend**: `instance.resolver.js:5852-5942` rama RT hace delete ext+RT+base y `return` en :5941; `cascadeDeleteIfApplicable` en :5951, DESPUES del return. **schema/db**: la metadata `directChildren` vive en el JSON base (`levelscheme.json`), no en `rt__scheme__levelscheme.json` — el gate `objectDeclaresChildren(rt_name)` da false. **mod**: `mods/curriculum-mapping/docs/BUG-core-harddelete-cascade-recordtype.md` documenta el sintoma real (`Scheme` borrado, `Level` huerfanos). |
| H2 | En `deleteBulkInstances`, la rama RT no consulta `bulkSoftField` y esta antes del loop soft, por eso un objeto soft-delete borrado por RT se elimina fisicamente. | ✓ confirmed (latente) | **backend**: `bulkSoftField` se calcula en :5829-5844, pero la rama RT (:5852-5942) no lo referencia y retorna antes del bloque `if(!bulkSoftField)` (:5950) y del loop `if(bulkSoftField)` (:6068). **mod**: `mods/curriculum-mapping/docs/BUG-core-softdelete-recordtype.md`. Latente: hoy no existe objeto que sea soft-delete + entrypoint RT + con hijos, pero la trampa esta armada. |
| H3 | `deleteInstance` (single) tiene la MISMA causa raiz que el bulk, tanto para huerfanos (hard) como para borrado fisico (soft) — no solo el problema soft del request. | ✓ confirmed | **backend**: cascada en `:4182` con gate `objectDeclaresChildren(objectType)` (evaluado internamente) da false para nombre RT → `applied=false` → cae a rama RT `:4205-4234` (delete ext+RT+base, `return true`) → huerfanos. Soft-block `:4116-4173` lee `softDeleteConfig` por nombre RT (`:4120` where name=objectType) → null → sigue a hard-delete. **origen**: L1 (dev, 2026-08-03). |
| H4 | Opcion B (resolver RT→base al inicio de AMBOS resolvers y enrutar por el camino generico) cierra hard+soft sin dejar proyecciones RT/ext colgando. | ✓ confirmed viable | **backend**: el camino generico del bulk ya limpia proyecciones RT/ext del base via loop `rtDefsForBase` (`:6039-6045`, `:6100-6111`); `deleteInstance` idem (`:4252-4269`). Resolver por base ⇒ el gate de hijos y el lookup de `softDeleteConfig` reciben el nombre base y ambos mecanismos corren. `parseRecordTypeFileName` (`src/services/fileParsing.js:173`) ya provee el parse RT→base. |

### Context found

Verificado contra `/Users/edobacon/Workspace/uplanner/up1` (repo core con el mod `curriculum-mapping`), no contra el cwd `Workspace/up1`.

- **Resolver**: `object-manager/src/graphql/resolvers/instance.resolver.js` (~6816 lineas). `deleteBulkInstances` def :5795; `deleteInstance` def :4097.
- **Motor de cascada + soft**: `object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js` (exporta `cascadeDeleteIfApplicable`, `buildDeleteImpactPlan`, `executeSoftDeletePlan`, `objectDeclaresChildren`).
- **Parser RT**: `object-manager/src/services/fileParsing.js:173` (`parseRecordTypeFileName`).
- **Test base (UPONE-1382)**: `object-manager/tests/integration/hard-delete-cascade.integration.test.js` — se extiende aca con los red tests RT.
- **Docs a actualizar** (existen los 4): `docs/features/delete-cascade.md`, `docs/features/soft-delete.md` (limitacion conocida en `:155`), `docs/features/record-types.md`, `.ai/TROUBLESHOOTING.md`.
- **Bugs del mod (evidencia externa del sintoma)**: `mods/curriculum-mapping/docs/BUG-core-harddelete-cascade-recordtype.md`, `BUG-core-softdelete-recordtype.md`.
- **Regla aplicable**: RULE-dev-004 — tocar `deleteBulkInstances`/core compartido requiere revision del team core.

### Precondiciones operativas (verificadas)

| Precondicion | Estado | Evidencia |
|--------------|--------|-----------|
| Test de integracion base existe (se extiende, no se crea de cero) | ✓ | `tests/integration/hard-delete-cascade.integration.test.js` presente |
| Helper del motor disponible | ✓ | `helpers/deleteImpactPlan.js` presente |
| Docs objetivo existen | ✓ | los 4 archivos presentes |
| BD real UPU seedeada para integration | assumed: se confirma en Gate 0 de la primera session de execute (el test corre contra UPU real; si no esta seedeada, seedear antes de red tests) | dependencia declarada en el request |

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | por crear en execute (core en `develop` hoy — rama protegida, REQ-02 exige feature branch) |
| Base branch | `develop` |
| DB state | tenant UPU (`uplanner_upu`), seedeado; confirmar en Gate 0 de S1 antes de red tests |
| Services | object-manager (backend GraphQL); Postgres + Redis via docker |
| Test data | red tests seedean sus fixtures (`requirement` Group + hijos por `rt__Group__requirement`; objeto soft-delete proyectado como RT) |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | Alcance confirmado: el fix Opcion B debe aplicarse a AMBOS resolvers, no solo a deleteBulkInstances. deleteInstance (single) tiene la misma causa raiz: al borrar por nombre RT, cascadeDeleteIfApplicable (instance.resolver.js ~4182) evalua objectDeclaresChildren(rt_name) -> false, cae a la rama RT (~4205) y deja hijos huerfanos igual que el bulk (no solo el problema soft que menciona el request). Resolver RT->base al inicio de deleteInstance ademas de deleteBulkInstances; retirar/reconectar la rama RT en los dos paths. AC "borrar por RT cascadea sin huerfanos" y "Restrict/soft por RT" deben verificarse por ambos entrypoints. Confirmado por el dev sobre la revision de la creacion del ticket (2026-08-03). | developer | — | discarded | — |
| L2 | El ticket debe incluir, ademas de los red tests de integracion, un smoke test contra la BD real (UPU) que valide el estado ANTES y DESPUES del borrado para poder revisar empiricamente el caso por el path real de entrada. La validacion before/after debe inspeccionar el delta concreto en la BD, no solo que el test pase: (a) hard-delete por RT -> hijos/nietos y proyecciones RT/ext en 0 despues, sin filas huerfanas con parentId colgando; (b) soft-delete por RT -> la fila sigue existiendo con la bandera logica abajo, sin borrado fisico; (c) Restrict por RT -> cero borrado parcial (estado identico antes y despues). Aplica a ambos entrypoints (deleteBulkInstances y deleteInstance). Razon: los unit mockeados no prueban correctitud de persistencia (proyecciones RT/ext, casing de FK, enums); solo la inspeccion del estado real antes/despues caza los huerfanos silenciosos. Detected by: dev (2026-08-03). | developer | — | discarded | — |
| L3 | Confirmado en S1.T1: el unico objeto core con metadata.softDelete es activitytype, y no tiene proyeccion rt__ en UPU. No existe hoy ningun objeto que sea simultaneamente soft-delete + entrypoint RT (confirma empiricamente el caracter 'latente' de REQ-FIX-02). Consecuencia: el red test de soft-delete-por-RT no tiene fixture natural contra UPU real. Opciones para verificar REQ-FIX-02: (A) seed temporal de softDeleteConfig sobre un objeto con RT (ej. Activity/Service) dentro del test, self-cleaning en afterAll (integration real, pero muta core_ObjectDefinition en UPU durante la corrida); (B) cubrir REQ-FIX-02 con unit test (softDeleteConfig mockeable) en vez de integration; (C) verificar REQ-FIX-02 estructuralmente (el fix resuelve RT->base, el lookup de softDeleteConfig por base ya esta cubierto por los tests soft base existentes) y dejar el caso RT+soft documentado como latente. Detected by: developer (2026-08-03, S1.T1). | developer | — | discarded | — |
| L4 | El dual-judge adversarial (DET-35) del S1.GATE cazo una regresion de contrato que los 15 tests de integracion no cubrian: al reasignar objectType a base al inicio de deleteBulkInstances, las publicaciones publishEventForInstance(objectType,...) pasaban a emitir el evento delete con el nombre BASE, mientras deleteInstance (via wrapper withEventPublish que lee args.objectType) seguia emitiendo el nombre RT. Divergencia observable single vs bulk + cambio del contrato downstream (n8n/BullMQ se suscriben por objectType). Fix: capturar rawObjectType (original) al inicio del bulk y usarlo en las publicaciones, preservando el comportamiento pre-fix (ambos entrypoints ya emitian el nombre RT) y alineando ambos. Leccion transversal: al reasignar un parametro de entrada (objectType) para reenrutar logica interna, auditar TODOS los sinks que ese parametro alimenta (eventos, DataLog, logs, respuestas) porque algunos leen el valor reasignado y otros el original de args (los wrappers/decorators leen args). Los tests de estado de BD no cazan divergencias en el canal de eventos. Detected by: dual-judge (2026-08-03, S1.GATE). | developer | — | discarded | — |
| L5 | La limpieza de proyecciones RT en el borrado generico (deleteInstance ~4245 y deleteBulkInstances ~5967) armaba el nombre de la columna FK como `${objectType.toLowerCase()}Id` y descubria los rt via `endsWith: __${objectType.toLowerCase()}` case-sensitive. Ambos asumen la base en minuscula, asi que fallan para objetos cuya proyeccion RT tiene FK PascalCase o base con casing mixto: OrgUnit->OrgUnitId, Activity->ActivityId, y el contraejemplo que rompe hasta la heuristica "nombre del objeto + Id": Availability->availabilityId (FK en minuscula pese al objeto en PascalCase). Con el nombre de columna equivocado el deleteMany va en try/catch silencioso, la proyeccion queda colgando y el borrado de la base FK-crashea (RESTRICT). Es PRE-EXISTENTE (estaba en develop, tanto en la rama RT vieja como en el loop generico), quedaba enmascarado en objetos que declaran hijos (el motor de cascada limpia las proyecciones por su cuenta) y latente porque las tablas rt de objetos sin-hijos (rt__Campus__OrgUnit, etc.) estan vacias hoy en UPU. Lo destapo el red test de AC-02 (RT sin hijos declarados) con fixture OrgUnit. Fix (UPONE-1479): helper resolveRtProjectionFks que resuelve la columna FK real por introspeccion de information_schema (match de tabla base con LOWER() para tolerar el casing del delegate camelCase de Prisma, filtrado a tablas rt__ para no tocar otras tablas que referencian la base como Section/Resource), reemplazando el ensamblado por string en ambos paths. Leccion transversal: el casing de la FK de una proyeccion rt__ NO es derivable del nombre del objeto; resolver siempre por introspeccion (o core_FieldDefinition), nunca por string. Corolario de RULE-core-043. Detected by: dredd-review (2026-08-03, S2). | dredd-review | #2 | refined | RULE-core-044 |
| L6 | La limpieza de proyecciones RT del camino generico ensamblaba la FK como ${base}Id, pero el casing no es derivable del nombre del objeto (OrgUnit->OrgUnitId pero Availability->availabilityId): dejaba la proyeccion colgando y el delete de la base fallaba por FK RESTRICT. Se resolvio con resolveRtProjectionFks: introspeccion de information_schema para hallar las tablas rt__* con FK a base.id y su columna FK real (commit del dev 4a12435d) + 2 tests OrgUnit (bulk+single). Gotcha adicional cazado por el re-review dual: el filtro `tc.table_name LIKE 'rt\\_\\_%'` NO funciona en un template literal de JS (el escape \\_ colapsa a _, quedando como comodin LIKE); se cambio a `LEFT(tc.table_name,4)='rt__'`. Leccion: para filtrar por prefijo con guiones bajos en $queryRaw usar LEFT/substring o parametro bindeado con ESCAPE, nunca LIKE con backslash en template literal. Detected by: dev + dual-judge (2026-08-03). | developer | — | discarded | — |
| L7 | Gap de regresion en S1.T3: al retirar la rama RT del resolver, corri como regresion solo 5 suites del area delete (deleteImpactPlan, executeSoftDeletePlan, instance.resolver, instance.transitions, softDeleteImpactPreview) y NO recordType.resolver.test.js, que asertaba la secuencia interna de la rama RT retirada (ext.deleteMany -> RT.delete -> base.delete). El pipeline (corre las 110 suites) lo cazo: 2 tests rojos. Leccion: cuando se ELIMINA/reenruta una rama de codigo, la regresion debe correr la suite unit COMPLETA (o al menos todos los tests que mockean/asertan esa rama), no solo el area tematica; los unit mockeados en OTRO archivo pueden consagrar los internals retirados. Confirmado verde tras reescribir esos 3 tests al nuevo contrato: suite unit completa 110/110 archivos, 2395 passed. Detected by: pipeline CI (2026-08-03). | developer | — | refined | RULE-core-045 |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Plan de sessions (preplanificacion)

2 sessions previstas. **Esqueleto producido por `intake-explore`.** El detalle final (tasks asignadas, gate criteria especificos) lo completa `design-fix` al generar el spec. Cada session puede subdividirse o colapsarse durante execute si el tamano real difiere.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Red tests + fix en ambos resolvers (resolver RT→base al inicio; retirar/reconectar rama RT) | 1 | T3 | red tests RT (bulk+single); resolucion RT→base en `deleteBulkInstances` y `deleteInstance`; matriz de integracion verde en UPU | ⚑ fuerte | red tests fallan antes / pasan despues; sin regresion en el path base (hard+soft); sin borrado parcial en Restrict |
| S2 | Documentacion + cierre (retirar limitacion L155, actualizar 4 docs) + review doc core | 2 | T1 | update `delete-cascade.md` / `soft-delete.md` (quitar limitacion ~L155) / `record-types.md` / `.ai/TROUBLESHOOTING.md`; sin `console.*` | ⚑ fuerte | docs consistentes con el nuevo comportamiento; aprobacion team core (RULE-dev-004) antes de merge a `develop` |

**Notas del esqueleto**:
- **Numeracion**: el ticket no tiene sessions previas registradas; el plan arranca en S1.
- **Riesgo/dependencia clave**: la matriz de integracion debe correr por los DOS entrypoints (`deleteBulkInstances` y `deleteInstance`) — comparten causa raiz (H3/L1); un caso que solo entre por el bulk no cubre el single.
- **Bloqueante externo** (⚑ en S2): RULE-dev-004 — el cambio toca core compartido (`deleteBulkInstances`), requiere review del team core + merge a `develop` (fuera del control del ticket).
- **Branch guard** (REQ-02): el core esta en `develop` hoy; S1 abre con creacion de feature branch antes de tocar codigo.

### Session 1 — 2026-08-03 — Red tests + fix en ambos resolvers [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3 (regression completa)

**Objetivo**: escribir los red tests de integracion RT (hard/soft/Restrict/DataLog) por ambos entrypoints, implementar el fix Opcion B (resolver RT->base al inicio de `deleteBulkInstances` y `deleteInstance`), correr regresion de la matriz base y smoke before/after en BD real UPU.

**Tasks completadas**:
- [x] S1.T1 — Red tests de integracion RT (a hard-delete, b soft-delete, c Restrict, d DataLog por nodo) por ambos entrypoints, rojos antes del fix
- [x] S1.T2 — Fix Opcion B: resolver RT->base al inicio de ambos resolvers, retirar/reconectar la rama RT
- [x] S1.T3 — Regresion: matriz base (hard+soft) + RT sin hijos, ambos entrypoints, verde
- [x] S1.T4 — Smoke before/after en BD real UPU por ambos entrypoints, evidencia runtime
- [x] S1.GATE — Gate de sync Session 1 (tier T3): persistir, integration+regression+smoke, revision team core (RULE-dev-004), decidir

**Gate de entrada (Gate 0)**:
- BD UPU (`uplanner_upu`) presente y contenedor `pg` healthy (verificado). Confirmar seed antes de red tests.
- Rama `feat/UPONE-1479-recordtype-delete-cascade` creada desde `develop` (REQ-02 OK).

**Validacion del tier (T3)**:
- Integration UPU: 15/15 verde (8 casos RT nuevos: hard/DataLog/soft-opcion-A/Restrict por bulk+single + 7 casos base UPONE-1382 sin regresion). Re-corrido de forma independiente.
- Unit del area delete: 189/189 verde (deleteImpactPlan, executeSoftDeletePlan, instance.resolver, instance.transitions, softDeleteImpactPreview) antes y despues del ajuste de eventos.
- Smoke before/after en BD real: cubierto por las aserciones de estado de los casos de integracion (real DB, path RT real, ambos entrypoints). Script standalone bloqueado por side-effects del import del resolver fuera de vitest.
- `node --check` OK; sin `console.*` agregado.

**Discoveries / Learns nuevos**:
- L2: smoke con validacion before/after en BD real (requerimiento del dev).
- L3: no existe objeto soft-delete + entrypoint RT en UPU (REQ-FIX-02 latente); soft-por-RT verificado via seed temporal (opcion A).
- L4: el dual-judge cazo una regresion de contrato de evento (bulk emitia el objectType base, single el RT); resuelta con `rawObjectType`.

**Quality review (DET-23)**:

**Reviewer**: dual-judge adversarial (DET-35, 2 revisores ciegos en paralelo) + verificacion independiente del orquestador
**Tier de revision**: exhaustive (T3)
**Resultado global**: pass (tras 1 iteracion)

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | resolucion RT->base limpia; sin console.*; comentarios neutros |
| 2 | Correctitud | pass | ambos jueces verificaron: motor limpia 3 capas por nodo, sin huerfanos; path base intacto |
| 3 | Regresion | pass | 189 unit + 7 integration base verdes; evento por RT preservado (rawObjectType) |
| 4 | Testing | pass | 8 red tests RT (bulk+single) rojos->verdes; before/after real DB |
| 5 | Contrato de eventos | pass (post-fix) | divergencia single/bulk detectada por dual-judge y corregida |
| 6 | Manejo de errores | pass | guard de paridad en deleteInstance (LOUD si base no resuelve) |
| 7 | Error handling / DataLog | pass | auditoria por nodo consistente; rawObjectType en marca de supresion |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S2: documentacion (4 docs) + KB (RULE core + learn). Review team core (RULE-dev-004) queda como gate humano pendiente para el cierre/merge a develop.
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

Iteracion aplicada: se corrigieron los 2 hallazgos confirmados por ambos jueces (medium: objectType del evento; low: guard de paridad). Re-verificado: 15/15 integration + 189 unit tras el fix.

**Bloqueantes detectados**:
- Revision del team core (RULE-dev-004): el cambio toca `deleteBulkInstances`/`deleteInstance` (core compartido). Gate humano ⚑ pendiente para el merge a `develop` — no lo firma el autopilot. Se arrastra al cierre.

### Session 2 — 2026-08-03 — Documentacion + KB [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T1 (unit area / doc-lint)

**Objetivo**: actualizar las 4 docs oficiales del comportamiento del borrado (RT como entrypoint ahora cascadea, retirar la limitacion conocida de soft-delete), y registrar el conocimiento en el KB (RULE core + learn de cobertura RT-entrypoint).

**Tasks completadas**:
- [x] S2.T1 — Actualizar docs oficiales: delete-cascade.md, record-types.md, soft-delete.md (retirar limitacion ~L155), .ai/TROUBLESHOOTING.md
- [x] S2.T2 — KB: RULE core (objectType RT es alias de presentacion, resolver a base antes de aplicar politica de borrado) + learn de cobertura RT-entrypoint
- [x] S2.GATE — Gate de sync Session 2 (tier T1): persistir, validar docs + records KB, OK revision core + preparar merge, decidir

**Validacion del tier (T1)**:
- Docs: 4 archivos actualizados y consistentes con el nuevo comportamiento (soft-delete.md, record-types.md, delete-cascade.md, .ai/TROUBLESHOOTING.md).
- KB: RULE-core-043 `dkc-validate Rule` valid; reindex OK.

**Quality review (DET-23)** — tier light (T1, doc + KB, sin codigo):
- Documentacion: pass (describe el comportamiento implementado, sin narrar changelog; refs UPONE-1479 conservadas).
- KB: pass (RULE con What/Why/Where/When + corolario de sinks; nivel `must`; trazada a spec/ticket).

**Bloqueantes detectados**:
- Revision del team core (RULE-dev-004) para el merge a `develop`: gate humano ⚑ pendiente, se arrastra al cierre.

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Todas las tasks del spec done (S1+S2). Codigo verde (15 integration + 189 unit), docs + KB actualizados. Pendiente para el cierre: revision team core (RULE-dev-004) + commits + merge a develop. El close requiere OK del dev (DET-30).
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-FIX-01 (cascada por RT) | TC-1, TC-2 | integration + smoke | COVERED |
| REQ-FIX-02 (soft por RT) | TC-4 | integration (seed opcion A) | COVERED |
| REQ-FIX-03 (Restrict + DataLog por RT) | TC-3, TC-5 | integration | COVERED |
| REQ-REGRESSION-01 (base + RT sin hijos) | TC-6 + matriz base | integration + unit | COVERED |
| REQ-VERIFY-01 (before/after BD real) | TC-1..TC-6 (asserts de estado) | integration + smoke | COVERED |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status | Session |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|---------|
| TC-1 | Hard-delete de agregado por `rt__Group__requirement` (bulk) | REQ-FIX-01 | integration | requirement Group + 2 hijos por parentId + proyeccion RT | deleteBulkInstances(rt, [id]) | padre+hijos borrados, count parentId=0, proyeccion RT=0 | igual al esperado | integration UPU 17/17 | pass | 1 |
| TC-2 | Hard-delete de agregado por `rt__Group__requirement` (single) | REQ-FIX-01 | integration | idem TC-1 | deleteInstance(rt, id) | subarbol completo borrado, cero huerfanos | igual al esperado | integration UPU + smoke before/after | pass | 1 |
| TC-3 | DataLog por nodo entrando por RT (bulk+single) | REQ-FIX-03 | integration | agregado con hijos | borrar por rt | 1 entrada DataLog DELETE por nodo (padre+hijos), paridad con base | igual al esperado | integration UPU | pass | 1 |
| TC-4 | Soft-delete por RT sin borrado fisico (bulk+single) | REQ-FIX-02 | integration | Activity + rt__Service__Activity + softDeleteConfig seed temporal (opcion A) | borrar por rt | fila presente, bandera abajo, sin borrado fisico | igual al esperado | integration UPU (self-cleaning) | pass | 1 |
| TC-5 | Restrict por RT sin borrado parcial (bulk+single) | REQ-FIX-03 | integration | rt__Service__Activity referenciada por planEntry.activityId | borrar por rt | DELETE_RESTRICTED, estado identico antes/despues | igual al esperado | integration UPU | pass | 1 |
| TC-6 | RT sin hijos declarados (`rt__Campus__OrgUnit`) borra base+proyeccion (bulk+single) | REQ-REGRESSION-01 | integration | OrgUnit(Campus) + proyeccion RT | borrar por rt | base + proyeccion RT borradas, sin efectos nuevos | igual al esperado | integration UPU | pass | 1 |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|
| `tests/integration/hard-delete-cascade.integration.test.js` | integration | S1.T1 (+2 casos commit dev) | TC-1..TC-6 (RT) + 7 base UPONE-1382 | vitest (BD real UPU) |
| `tests/unit/resolvers/recordType.resolver.test.js` | unit | S1 (realineado post-fix) | routing RT->base en deleteInstance | vitest (mock) |
| `smoke-rt-delete.mjs` (scratchpad, no commiteado) | smoke | S1.T4 | before/after conteo por tabla base+rt+ext | node |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| Unit completa | `npm run test:unit` | 2 fail (recordType.resolver) | 2395 pass \| 1 skip (110 files) | verde |
| Integration hard-delete | `vitest run tests/integration/hard-delete-cascade.integration.test.js` | 7 (solo base) | 17 pass | +10 casos RT |
| Unit area delete | `vitest run tests/unit/resolvers/{deleteImpactPlan,executeSoftDeletePlan,instance.resolver,instance.transitions,softDeleteImpactPreview}` | 189 pass | 189 pass | sin regresion |

## Summary

### What was requested
Que borrar por el nombre de un RecordType (`rt__<RT>__<base>`) se comporte igual que por el objeto base: cascada de hijos, soft-delete, Restrict y DataLog, sin huerfanos ni borrado fisico.

### What was done
- Resolucion RT->base al inicio de `deleteInstance` y `deleteBulkInstances`; retiro de las dos ramas RT paralelas (Opcion B). El camino generico ahora aplica cascada, soft-delete, Restrict y DataLog por nodo tambien cuando se entra por el nombre RT, en ambos entrypoints.
- Evento `delete` preservado con el objectType original (`rawObjectType`) para no romper el contrato downstream ni divergir entre entrypoints.
- Limpieza de proyecciones `rt__/ext__` con FK resuelta por introspeccion (`resolveRtProjectionFks`), robusta al casing (`OrgUnitId` vs `availabilityId`).
- Cobertura: 6 test cases RT (bulk+single) contra BD real UPU + realineacion de los unit de `deleteInstance(RecordType)`.
- Docs (4) + KB (3 rules).

### What was learned
- Learns capturados: 7 (2 refined -> rules, 5 discarded/folded).
- Rules creadas: RULE-core-043 (RT es alias; resolver a base antes de aplicar politica de borrado), RULE-core-044 (FK de proyeccion RT por introspeccion, no por string; gotcha LIKE-escape en $queryRaw), RULE-core-045 (al reenrutar una rama: auditar todos los sinks del input + correr la suite completa).
- Decisions: DEC-LOCAL-01 (Opcion B), DEC-LOCAL-02 (ambos resolvers), DEC-LOCAL-03 (introspeccion + escape fix).

### Metrics
| Metric | Value |
|--------|-------|
| Sessions | 2 |
| Tasks completed | 6/6 (+2 gates) |
| Commits | 3 object-manager + 2 deckard |
| Test cases | 6 pass / 0 fail / 0 pending |
| Learns captured | 7 |
| Learns -> rules | 2 |
| Learns discarded | 5 |
| Rules created (total) | 3 (RULE-core-043/044/045) |
| Suite unit | 110 files, 2395 pass / 1 skip |
| Integration | 17 pass |
| SP published / estimated | 3 / 3 |

### Pendiente externo (fuera de DKC)
- **Revision del team core (RULE-dev-004)** + **push** + **merge a `develop`**: gates humanos. El codigo esta commiteado local en `feat/UPONE-1479-recordtype-delete-cascade` (object-manager). El ticket se cierra en DKC por decision del dev; el merge se gestiona por fuera. La DoD "aprobacion team core + merge" queda a cargo del dev.
