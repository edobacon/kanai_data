---
id: DOC-kb-sp7-BUG-core-harddelete-recordtype-entrypoint-cascade
project: up1
type: doc
---

# BUG (core) - El borrado no cascadea ni respeta soft-delete cuando el entrypoint es un RecordType

- **Titulo Jira (propuesto):** Core | El borrado por RecordType no cascadea hijos ni respeta soft-delete (huerfanos + borrado fisico silencioso)
- **Tipo:** Bug / Fix (core) · **Layer:** core (`object-manager`)
- **Epica:** por asignar (plataforma / borrado). Origen funcional: [UPONE-1382](https://u-planner.atlassian.net/browse/UPONE-1382) (hard delete + cascada, SP6)
- **Descubierto en:** [UPONE-1454](https://u-planner.atlassian.net/browse/UPONE-1454) (mod `curriculum-mapping`, caso `LevelScheme`)
- **Dueno:** por asignar (team core) · **Prioridad:** Mayor · **Estado:** Propuesta / Backlog · **SP estimado:** 3
- **Repo:** `object-manager` (core). Requiere revision del team core (RULE-dev-004) por tocar `deleteBulkInstances`.
- **Fecha ficha:** 2026-07-24 · **Verificacion:** codigo + git blame + suite de tests (reproduccion runtime pendiente)

> **Naturaleza**: hueco del **core**, no del mod. El motor de cascada de UPONE-1382 y el soft-delete
> declarativo corren solo cuando el borrado entra por el objeto base. Cuando el catalogo se lista por el
> RecordType y el borrado entra con el nombre del RT como `objectType`, el resolver cae en una rama RT
> preexistente que borra **fisicamente** solo el registro objetivo y retorna **antes** de ambos mecanismos,
> dejando los hijos huerfanos y saltandose la politica de soft-delete, sin lanzar error.

---

## 0. TL;DR

- Borrar un RecordType que es a la vez el entrypoint del catalogo y un agregado con hijos declarados (`metadata.directChildren`) deja **hijos huerfanos**. Inconsistencia silenciosa de datos.
- **Dos sintomas, misma causa raiz**: (a) hard-delete no cascadea hijos (huerfanos); (b) un objeto con `softDelete` borrado por su nombre RT es **eliminado fisicamente** en vez de marcado inactivo (borrado destructivo indebido). Ambos porque la rama RT resuelve la metadata/config por el nombre del RT, no del base, y corta el flujo antes de los dos mecanismos.
- No es la relacion la que no esta soportada (el patron `directChildren` + `recursiveBy` si esta cubierto cuando se entra por el base). Lo que no se cubrio es **esa relacion alcanzada a traves del RT como entrypoint de borrado**.
- Reproducible **sin el mod `curriculum-mapping`**: `requirement` (en el checkout actual) es el gemelo topologico exacto de `LevelScheme`.
- **Enfoque elegido (Opcion B)**: resolver RT a base al inicio de `deleteBulkInstances` y enrutar TODO el borrado por el camino generico. **Un solo cambio cierra hard-delete en cascada Y soft-delete de RT.**
- Estado de riesgo: el hard-delete esta **vivo** (`LevelScheme`); el soft-delete de RT es **latente hoy** (ningun objeto es a la vez softDelete + RT-entrypoint + con hijos), pero el fix lo cierra de todas formas para no dejar la trampa armada.
- Esfuerzo: **3 SP** (aprox. 4 dias dev + revision team core), con red tests previos de ~1 dia.

---

## 1. Request / Historia de usuario

Como **plataforma (core)**, cuando un usuario borra un registro de tipo RecordType que declara hijos
(`metadata.directChildren`), quiero que el borrado **cascadee el subarbol completo** (hijos, nietos,
capas RT/ext de cada nodo) y **audite cada nodo**, para no dejar filas huerfanas en la base de datos,
**independientemente de si el borrado entra por el nombre del objeto base o por el nombre del
RecordType**.

Hoy el borrado que entra por el nombre del RecordType borra solo el registro objetivo y deja los hijos
huerfanos, sin error.

---

## 2. Contexto y caso que lo destapo

`LevelScheme` (mod `curriculum-mapping`) es un agregado padre-hijos **en la misma tabla**: un `Scheme`
(recordType `Scheme`) y sus niveles (recordType `Level`), enlazados por `parentId`. El base declara:

```json
"directChildren": [
  { "name": "levels", "object": "LevelScheme", "fk": "parentId", "recursiveBy": "parentId" }
]
```

El catalogo se lista por el RT `rt__Scheme__levelscheme`. Al activar `canDelete: true` y borrar un
esquema desde la UI, el `Scheme` se elimina pero **sus niveles quedan huerfanos** (filas `Level` con
`parentId` apuntando a un `Scheme` inexistente). La BD queda inconsistente.

---

## 3. Causa raiz (verificada en codigo)

Archivo: `object-manager/src/graphql/resolvers/instance.resolver.js`, resolver `deleteBulkInstances`.

1. **Rama RecordType** (lineas ~5689-5779): si `parseRecordTypeFileName(objectType)` es truthy, el
   bloque borra **solo el registro objetivo** por cada id:
   - `deleteMany` de la extension (~5738),
   - `delete` de la fila RT (~5740),
   - `delete` de la fila base (~5741),
   y hace **`return` en la linea ~5778**. No consulta ni camina `directChildren`.
2. **El motor de cascada vive DESPUES de ese `return`**: `cascadeDeleteIfApplicable(...)` se invoca
   recien en la linea ~5788, dentro del `if (!bulkSoftField)`, que es el camino **no-RT** (objeto base).
3. **Doble barrera**, aunque parcheemos solo el `return`: el gate `objectDeclaresChildren(objectType,...)`
   (`helpers/deleteImpactPlan.js:1501`) lee la metadata via `readObjectMetadataBlock(objectType,...)`, y
   ese lector (`helpers/deep-clone-polymorphic.js:36`) arma el filename como
   `objectType.toLowerCase() + '.json'`. Con un RT (`rt__scheme__levelscheme.json`) **no existe** ese
   archivo; la declaracion vive en el base (`levelscheme.json`). Hay que **resolver RT a base** para que
   el motor lea `directChildren`.

**Detalle clave**: la rama RT es un camino paralelo que corta el flujo antes del motor, y aun sin ese
corte, el motor no encontraria la metadata por el nombre RT.

### 3.1. El mismo hueco afecta al soft-delete (misma raiz, sintoma distinto)

El soft-delete declarativo (bandera logica en vez de borrado fisico) sufre la **misma causa raiz**, con
una manifestacion **mas severa** y una variacion entre bulk y single:

- **Bulk (`deleteBulkInstances`, el path real de la UI)**: la rama RT (5694) esta posicionada **antes** de
  los dos bloques de borrado, el hard-cascade (5787, `if (!bulkSoftField)`) y el loop soft-delete (5905,
  `if (bulkSoftField)`). La rama RT **no tiene guarda de soft** y retorna en 5778. Consecuencia: un objeto
  con `metadata.softDelete` borrado por su **nombre RT** es **eliminado fisicamente** (ext+RT+base), no
  marcado inactivo. Es peor que el caso hard: ademas de huerfanos, **destruye un registro que debia
  preservarse** y pierde la semantica de recuperacion/auditoria. Ademas `bulkSoftField` se resuelve leyendo
  `softDeleteConfig` WHERE `name = objectType` (~5669-5673), o sea por el nombre RT, que no lo declara.
- **Single (`deleteInstance`)**: el orden es **distinto**. El bloque soft-delete (~3991) esta **antes** de
  la rama RT (~4061). Pero `softDeleteConfig` se lee por `objectType` (nombre RT), no lo encuentra, cae al
  hard-cascade (tambien por RT, n/a) y termina en la rama RT que hard-deletea. Mismo desenlace (no
  soft-deletea), **pero por otra razon**: en bulk es corte posicional; en single es el miss de metadata por
  nombre.

**Estado de riesgo del soft-delete: latente hoy.** No existe ningun objeto que sea a la vez `softDelete` +
entrypoint-RT + `directChildren`. `ActivityType` (uengagement) declara `softDelete: { field: "isActive" }`
pero es un objeto base plano (la palabra "recordType" solo aparece en su descripcion). El caso hard-delete
si esta **vivo** (`LevelScheme`). Aun latente, el fix elegido lo cierra para no dejar la trampa armada.

**Por que un solo fix cierra ambos**: resolver RT a base al inicio del resolver alimenta el nombre base
tanto al lookup de `softDeleteConfig` como al gate de hijos, y enruta todo por el camino generico, que ya
sabe hacer soft-delete en cascada (`executeSoftDeletePlan`). Ver seccion 10, Opcion B.

---

## 4. Como se llego al gap (timeline de acciones)

Linea de tiempo de las decisiones tecnicas, en orden. Describe el estado del codigo en cada momento, no a
quien lo hizo.

1. **2026-05-07 (commit `6dd872b6c`) - se agrega la rama RecordType al borrado masivo.** Motivo: las
   tablas RT usan la FK del base como PK (no tienen columna `id`), asi que el path generico fallaba con
   "Unknown argument `id`" al borrar por nombre RT. La rama resuelve ese caso borrando el registro objetivo
   (ext + RT + base) y retornando. En ese momento el borrado no tenia cascada declarativa, asi que "borrar
   solo el objetivo" era el comportamiento completo y correcto.

2. **SP6 - UPONE-1382 define el alcance del hard-delete sobre objetos BASE.** El problema se encuadra como
   "borrar el objeto base y bajar a hijos polimorficos + cadena de version". Todos los casos de aceptacion
   entran por `deleteBulkInstances("<Base>", [id])` (`AcademicProgram`, `Curriculum`, `Activity`,
   `Offering`). Los RT figuran solo como hijos/proyecciones que cuelgan del base, nunca como el `objectType`
   de entrada que a su vez declara hijos. El unico mod con fixtures entonces (curriculum-design) tiene esa
   topologia: los RT cuelgan de un base distinto y el borrado entra por el base.

3. **2026-07-14 (commit `338162bd1`) - se inserta el motor de cascada.** Se conecta
   `cascadeDeleteIfApplicable` en `deleteBulkInstances`, colgado del path base, **despues** del `return` de
   la rama RT de mayo. Coherente con el alcance (entrypoint base): la rama RT preexistente no se revisa como
   entrypoint-con-hijos, y queda como camino paralelo que corta antes del motor.

4. **2026-07-17 (commit `7634e15e`) - se ordena soft-delete antes de la cascada.** Ajuste tras un merge de
   develop. Refuerza el patron: el soft-delete tambien se resuelve en el path base, keyed por `objectType`,
   sin tocar la rama RT.

5. **Cobertura de tests: siempre por nombre base.** Los unit (`tests/unit/resolvers/deleteImpactPlan.test.js`)
   usan `objectType` `Activity` / `Curriculum` / `CurricularSection`. El integration real
   (`tests/integration/hard-delete-cascade.integration.test.js`) entra siempre por el base; su caso "RT"
   (linea ~201, `rt__Service__Activity`) entra por `objectType: 'Activity'` y cascada hacia abajo hasta
   limpiar la proyeccion RT de un hijo. Es RT-como-hijo, no RT-como-entrypoint. El panel dual-judge (DET-35)
   cazo 7 bugs de runtime del motor, todos dentro del path base: la topologia RT-como-entrypoint no estaba
   en las fixtures, y no se caza lo que no se ejercita.

6. **SP7 - aparece la topologia que lo destapa.** El mod `curriculum-mapping` (`LevelScheme`) introduce el
   primer agregado que se lista por el RT y declara hijos en el mismo objeto. Al borrar por el nombre RT, el
   flujo entra en la rama de mayo, retorna antes del motor, y deja los hijos huerfanos.

**Sintesis**: no es una regresion de lo construido; el motor hace lo prometido, con evidencia real. Es un
gap de cobertura: el alcance y las fixtures se derivaron de un modelo de datos sin el entrypoint
RT-con-hijos, y la rama RT preexistente quedo como camino paralelo sin reconectar cuando se agrego el motor.

---

## 5. Impacto

- **(a) Hard-delete**: cualquier objeto RecordType que declare `directChildren` y se borre por el path
  generico (catalogo listado por el RT + `canDelete: true`) deja **huerfanos** a sus hijos. Fuente
  silenciosa de inconsistencia: no lanza error, "parece" que borro bien. **Vivo hoy** (`LevelScheme`).
- **(b) Soft-delete**: un objeto con `metadata.softDelete` borrado por su nombre RT es **eliminado
  fisicamente** en vez de marcado inactivo. Borrado destructivo indebido: se pierde el registro y la
  semantica de recuperacion. **Latente hoy** (ningun objeto es softDelete + RT-entrypoint + con hijos),
  pero queda armado para el primer objeto que combine ambas cosas.
- Ambos sintomas comparten la causa raiz (seccion 3) y **se cierran con un solo fix** (Opcion B).

---

## 6. Alcance

### Dentro de alcance
- Enrutar el borrado de un RecordType-entrypoint por el camino generico cuando el objeto base declara
  hijos (`directChildren` / `polymorphicChildren` / `polymorphicChildrenDerived`) **y/o** declara
  `softDelete`.
- Resolucion RT a base al inicio del resolver, para que **tanto el gate de hijos como el lookup de
  `softDeleteConfig`** lean por el nombre base.
- Cascada de hard-delete + auditoria DataLog por nodo (paridad con el path base).
- Respeto de `softDelete` entrando por RT: bajar bandera logica (con soft-cascade a hijos segun politica),
  no borrado fisico.
- Respeto de `Restrict` entrando por RT (referencias externas bloquean sin borrado parcial), tanto en hard
  como en soft.
- Matriz de regresion que cubra ambos entrypoints (base y RT) y ambos modos (hard y soft).
- **Documentacion oficial actualizada con el caso** (parte del entregable, ver seccion 6.1).

### 6.1. Documentacion a actualizar (parte del entregable)

Por DET-37 (completitud de planificacion, dimension docs) el cambio es observable en comportamiento, asi
que la doc oficial es MUST. Archivos exactos:

| Documento | Que cambia | Cuando |
|-----------|------------|--------|
| `object-manager/docs/features/delete-cascade.md` | Hoy no menciona el entrypoint RT. Agregar que el borrado por nombre RT (`rt__<RT>__<base>`) resuelve a base y cascada igual que el entrypoint base. Documentar la convencion "entrar por RT o por base es equivalente". | Al implementar el fix |
| `object-manager/docs/features/soft-delete.md` | Actualizar la limitacion conocida (linea ~155: "El rewrite de borrado para RecordTypes no esta cubierto..."): hoy describe el caso del hijo RT en soft-cascade; ampliar/corregir al caso **RT-entrypoint** y **retirarla** cuando el fix cierre el gap (dejar de ser limitacion). | Al implementar el fix |
| `object-manager/docs/features/record-types.md` | Agregar una nota de semantica de borrado: cuando un catalogo se lista por el RT, borrar por el nombre RT cascada hijos declarados y respeta `softDelete` (igual que por base). | Al implementar el fix |
| `object-manager/.ai/TROUBLESHOOTING.md` | Entrada breve: "huerfanos / borrado fisico inesperado al borrar por RecordType" -> apuntar a la convencion RT a base. (Opcional, alto valor para debugging futuro.) | Al implementar el fix |
| `sp7` core-changes-review (nuevo, tipo `sp6/UPONE-1382-core-changes-review.md`) | Documento de revision para el team core con el diff de este fix. | En T6 |

Fuera de esta lista: `CLAUDE.md` (raiz) tiene una seccion "RecordType (RT) Conventions"; agregar una linea
sobre la equivalencia de entrypoint es opcional y de bajo costo, se evalua al cierre.

### Fuera de alcance
- Cambios en el mod `curriculum-mapping` (su workaround custom se mantiene hasta que el fix de core este
  mergeado; ver seccion 15).
- Rediseno del motor de cascada / del soft-delete plan (se reusan tal cual).
- Cambios de schema / migraciones de datos (el fix es de logica, sin tocar la forma de la BD).
- Limpieza retroactiva de huerfanos ya generados en tenants (si existieran, es un item aparte de data
  hygiene).

---

## 7. Criterios de aceptacion (Gherkin)

**AC1 - Cascada por entrypoint RT (el fix)**
```
GIVEN un RecordType cuyo objeto base declara metadata.directChildren
  AND una instancia con 1 o mas hijos (incluidos nietos por recursiveBy)
WHEN se borra via deleteBulkInstances(objectType: "rt__<RT>__<base>", ids: [id])
THEN desaparecen el registro objetivo y TODOS sus descendientes
  AND no queda ninguna fila hija con FK/parentId apuntando a un id borrado
  AND se elimina la capa RT/ext de cada nodo borrado
```

**AC2 - RT sin hijos (no regresion)**
```
GIVEN un RecordType cuyo base NO declara hijos
WHEN se borra via deleteBulkInstances(objectType: "rt__<RT>__<base>", ids: [id])
THEN se borra solo el registro objetivo (ext + RT + base), igual que hoy
  AND no se invoca el motor de cascada
```

**AC3 - Auditoria por nodo**
```
GIVEN el borrado en cascada de un RT-entrypoint con hijos
WHEN el borrado se ejecuta
THEN existe una entrada core_DataLog DELETE por cada nodo borrado (padre + cada hijo)
  AND no se duplica la entrada raiz
```

**AC4 - Restrict entrando por RT**
```
GIVEN un RT-entrypoint cuyo subarbol es referenciado por una FK externa (Restrict)
WHEN se intenta borrar via el nombre RT
THEN el borrado se bloquea SIN borrado parcial
  AND se devuelven las restrictions con mensaje semantico
  AND ninguna fila del subarbol desaparece
```

**AC5 - Soft-delete por RT (cubierto por el enfoque elegido, Opcion B)**
```
GIVEN un RecordType cuyo base declara metadata.softDelete
WHEN se borra via deleteBulkInstances(objectType: "rt__<RT>__<base>", ids: [id])
THEN NO hay borrado fisico (la fila base + RT + ext se preservan)
  AND se baja la bandera logica del padre
  AND si el base declara hijos, la soft-cascade se propaga segun onSoftDelete por relacion
```

**AC6 - No regresion del path base**
```
GIVEN los casos existentes de la suite (entrypoint base: Curriculum, Activity, Offering)
WHEN corre el integration hard-delete-cascade contra BD real UPU
THEN todos siguen verdes (sin huerfanos, con DataLog por nodo)
```

---

## 8. Tareas / subtareas

- [ ] **T0 - Red tests de reproduccion.** Agregar dos casos al integration (`hard-delete-cascade.integration.test.js`): (a) hard: `requirement` `Group` + hijos por `parentId`, borrar via `objectType: 'rt__Group__requirement'`, assert **rojo** (huerfano); (b) soft: un objeto con `softDelete` proyectado como RT (fixture ad-hoc), borrar por nombre RT, assert **rojo** (fue borrado fisico en vez de logico). *Validacion: ambos corren rojo contra BD UPU.*
- [ ] **T1 - Confirmar enfoque B con team core.** Registrar la eleccion (necesidad/reuso, DET-32): resolver RT a base al inicio del resolver. A queda como alternativa descartada (no cierra soft-delete). *Validacion: decision registrada.*
- [ ] **T2 - Implementacion del fix** en `deleteBulkInstances`: resolver RT a base al inicio y enrutar por el camino generico, de modo que el lookup de `softDeleteConfig` y el gate `objectDeclaresChildren` reciban el nombre base. Retirar/neutralizar la rama RT como camino paralelo. *Validacion: los red tests de T0 pasan a verde.*
- [ ] **T3 - Paridad de auditoria.** Verificar DataLog por nodo (hard) entrando por RT (AC3). *Validacion: assert de DataLog en el test.*
- [ ] **T4 - Matriz de regresion.** Casos AC1-AC6: RT c/hijos (hard), RT s/hijos, base c/hijos, Restrict por RT, **soft-delete por RT (no borrado fisico + soft-cascade)**, base con soft-delete existente. *Validacion: suite integration verde sin regresion.*
- [ ] **T5 - Retiro del workaround del mod (o follow-up).** Evaluar volver `LevelScheme` al delete generico y retirar `deleteLevelSchemeValidated`; si no cabe en este ticket, dejar follow-up local. *Validacion: decision registrada + smoke UI si se retira.*
- [ ] **T6 - Documentacion oficial (seccion 6.1).** Actualizar `docs/features/delete-cascade.md`, `docs/features/soft-delete.md` (retirar la limitacion conocida), `docs/features/record-types.md` y `.ai/TROUBLESHOOTING.md` con el caso y la convencion RT a base. *Validacion: docs reflejan el comportamiento post-fix; sin limitacion obsoleta.*
- [ ] **T7 - Review doc de core + revision team core.** Crear el `sp7` core-changes-review con el diff y abrir la revision (RULE-dev-004). *Validacion: aprobacion team core + merge a develop.*

---

## 9. Test cases

| ID | GIVEN (fixture) | WHEN (entrada) | THEN (esperado) | Tipo | AC | Regresion |
|----|-----------------|----------------|-----------------|------|----|-----------|
| TC-1 | `requirement` `Group` + 2 hijos por `parentId` | `deleteBulkInstances("rt__Group__requirement", [groupId])` | padre y ambos hijos borrados; sin `parentId` colgando; RT/ext de cada nodo borrado | integration (BD real) | AC1 | nuevo (rojo hoy) |
| TC-2 | `curriculum` `Plan` + `planEntry` hijos | `deleteBulkInstances("rt__Plan__curriculum", [planId])` | plan y planEntries borrados; sin huerfanos | integration | AC1 | nuevo |
| TC-3 | RT sin hijos declarados | `deleteBulkInstances("rt__<RT>__<base>", [id])` | solo se borra el registro objetivo (ext+RT+base) | integration | AC2 | comportamiento actual |
| TC-4 | borrado en cascada por RT (TC-1) | ejecutar | DataLog DELETE por cada nodo; sin duplicar raiz | integration | AC3 | nuevo |
| TC-5 | RT-entrypoint con subarbol referenciado por FK externa | borrar por RT | bloqueado sin borrado parcial; restrictions devueltas | integration | AC4 | nuevo |
| TC-6 | objeto con `softDelete` proyectado como RT | `deleteBulkInstances("rt__<RT>__<base>", [id])` | NO borrado fisico; baja bandera; soft-cascade a hijos segun politica | integration | AC5 | nuevo (rojo hoy: hoy borra fisico) |
| TC-7 | casos existentes (base: Curriculum/Activity/Offering) | suite actual | verdes sin regresion | integration | AC6 | existente |
| TC-8 | objeto con `softDelete` base existente (ej. `ActivityType`) | borrar por nombre base | comportamiento soft actual intacto | integration | AC6 | existente |

Fixtures elegidas por ser el gemelo topologico de `LevelScheme` sin depender del mod `curriculum-mapping`:
`requirement` declara `directChildren` con `recursiveBy: "parentId"` + `recordType` Group/RecordState/MetricThreshold (`rt__Group__requirement`).

**Precondicion de ejecucion**: el integration corre contra el tenant real UPU (el `beforeAll` aborta si UPU
no tiene fixtures de referencia; necesita BD seedeada/synced). Un unit mockeado NO sirve como evidencia
(L14/L15 del TICKET-104: el mock consagra el bug).

---

## 10. Enfoque de implementacion (para el design)

### Opcion B - estructural (ELEGIDA; cierra hard-delete Y soft-delete de una)
Resolver **RT a base al inicio** de `deleteBulkInstances` y enrutar **todo** el borrado por el camino
generico: root + hijos + capas RT/ext (hard) o bajada de bandera + soft-cascade (soft). Elimina la rama
RT como camino paralelo.

Por que resuelve ambos sintomas de un solo cambio: la causa raiz comun es que el gate de hijos
(`objectDeclaresChildren`) y el lookup de `softDeleteConfig` **leen por el nombre del `objectType`
recibido**. Al resolver RT a base **antes** de esos dos puntos, ambos reciben el nombre base y encuentran
la declaracion. El motor de cascada (`cascadeDeleteIfApplicable`) y el soft-delete plan
(`executeSoftDeletePlan`) ya existen y se reusan tal cual.

Puntos de implementacion:
1. Al inicio del resolver, si `parseRecordTypeFileName(objectType)` es truthy, resolver el `baseObject` y
   usar ese nombre para: (i) `bulkSoftField`/`softDeleteConfig`, (ii) `objectDeclaresChildren`, (iii) el
   `objectType` que se pasa al motor y al soft-plan.
2. Que el borrado de las **capas RT/ext del root** (lo unico que la rama RT hacia bien) quede cubierto por
   el motor generico por-nodo (verificado: ya borra proyecciones RT/ext de hijos, ej. `rt__Service__Activity`).
3. Retirar/neutralizar la rama RT temprana para que no corte el flujo.

- **Pro**: un solo camino; cierra hard + soft; alineado con la "Alternativa" del reporte original.
- **Contra**: mayor blast radius (toca el path que hoy borra RTs sin hijos y resuelve `id` vs FK del RT).
  Mitigacion: matriz de regresion T4 (TC-3 RT sin hijos, TC-7 base, TC-8 soft base existente).

### Opcion A - localizada (DESCARTADA; no cierra soft-delete)
Llamar al motor de cascada dentro de la rama RT, antes del hard-delete, dejando la rama como camino
propio. Menor blast radius, pero **solo arregla el hard-delete**: el soft-delete de RT seguiria roto
(la rama RT no conoce `bulkSoftField`). Se descarta por dejar la mitad del bug abierto.

> Decision (RULE-dev-004): **B**, por cerrar el patron completo (ambos sintomas) en un cambio. Sujeta a
> validacion del team core sobre el refactor del entrypoint.

---

## 11. Definicion de terminado (DoD)

- [ ] Red tests TC-1 (hard) y TC-6 (soft) verdes con el fix (rojos sin el).
- [ ] Matriz de regresion TC-1..TC-8 verde en integration contra BD real UPU.
- [ ] DataLog por nodo verificado entrando por RT (AC3).
- [ ] Soft-delete por RT: no borrado fisico + soft-cascade verificados (AC5).
- [ ] `Restrict` por RT bloquea sin borrado parcial (AC4).
- [ ] Sin regresion en el path base, hard y soft (AC6, TC-7/TC-8).
- [ ] Sin `console.*` de debug en el codigo tocado.
- [ ] Decision de enfoque (B) y de retiro de workaround registradas.
- [ ] **Documentacion oficial actualizada (seccion 6.1)**: `delete-cascade.md`, `soft-delete.md` (limitacion retirada), `record-types.md`, `.ai/TROUBLESHOOTING.md`.
- [ ] Revision del team core aprobada; merge a `develop`.
- [ ] Review doc de core (`sp7`) creado.

---

## 12. Esfuerzo estimado (resumen)

Enfoque: Opcion B (cierra hard + soft en un cambio).

| Fase | Que se hace | Validacion | Esfuerzo |
|------|-------------|------------|----------|
| 0 | Red tests de reproduccion: hard (`requirement` Group + hijos por RT) + soft (objeto softDelete por RT) | Ambos rojos contra BD UPU | 1 dia |
| 1 | Fix en core (`deleteBulkInstances`, Opcion B): resolver RT a base al inicio + enrutar por generico | Los red tests pasan a verde | 2 dias |
| 2 | Matriz de regresion (TC-1..TC-8: hard c/hijos, RT s/hijos, base, Restrict, soft por RT, soft base) | Suite integration verde sin regresion | 1 dia |
| 3 | Documentacion oficial (seccion 6.1): 3 docs de `features/` + `.ai/TROUBLESHOOTING.md` + review doc `sp7` | Docs reflejan el post-fix; limitacion retirada | 0.5 dia |
| 4 | Revision team core + merge a `develop` (RULE-dev-004) | Aprobacion team core | Externo (no dev) |

**Total dev**: aprox. 4.5 dias efectivos = **3 SP**. El fixear ambos sintomas de una no duplica el costo:
comparten el punto de resolucion RT a base; el delta sobre "solo hard" es el red test soft (medio dia) +
2 casos de regresion soft (medio dia). La doc suma medio dia y es MUST por DET-37 (cambio observable).

---

## 13. Riesgos, dependencias y reversibilidad

- **Dependencia bloqueante**: BD UPU levantada y seedeada para el integration (bloquea los red tests y la
  matriz).
- **Riesgo principal**: regresion sobre el borrado de RTs sin hijos y la resolucion `id` vs FK del RT al
  colapsar la rama RT en el path generico. Mitigacion: TC-3 (RT sin hijos) y TC-7 (base) en la matriz.
- **Riesgo de auditoria**: que el motor no atribuya bien el DataLog del root cuando el entrypoint es RT.
  Mitigacion: TC-4.
- **Riesgo de soft-delete**: el fixture soft + RT es ad-hoc (no hay objeto real hoy); construirlo para el
  test requiere un objeto con `softDelete` proyectado como RT en el tenant de prueba. Mitigacion: se puede
  declarar en un mod de test o en fixtures de integration.
- **Reversibilidad**: alta. El cambio se aisla en `deleteBulkInstances`; revert = restaurar la rama RT con
  su `return` temprano. Sin migracion de datos ni cambio de schema.

---

## 14. Evidencia / referencias

- Resolver (bulk): `object-manager/src/graphql/resolvers/instance.resolver.js` (rama RT ~5689-5779 sin guarda de soft, `return` ~5778; `bulkSoftField` leido por objectType ~5666-5681; hard-cascade ~5787 `if(!bulkSoftField)`; loop soft ~5905 `if(bulkSoftField)`).
- Resolver (single): mismo archivo, `deleteInstance` (soft-delete ~3991 antes de la rama RT ~4061; `softDeleteConfig` leido por objectType).
- Motor: `object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js` (`objectDeclaresChildren:1501` lee por objectType, `cascadeDeleteIfApplicable:1517`, `executeSoftDeletePlan:1703`).
- Lector de metadata: `object-manager/src/graphql/resolvers/helpers/deep-clone-polymorphic.js` (`readObjectMetadataBlock:36`).
- Tests: `tests/unit/resolvers/deleteImpactPlan.test.js`, `tests/integration/hard-delete-cascade.integration.test.js`.
- Fixtures de repro: `objects/business/Base/requirement.json` (gemelo de `LevelScheme`), `objects/business/Base/curriculum.json`.
- Ticket origen: `deckard/projects/up1/tickets/TICKET-104.md` (UPONE-1382); review core: `sp6/UPONE-1382-core-changes-review.md`.
- Git (commits, sin autores): rama RT `6dd872b6c` (2026-05-07); cascada `338162bd1` (2026-07-14); orden soft-delete `7634e15e` (2026-07-17).

---

## 15. Workaround vigente en el mod

En `curriculum-mapping` se resolvio NO usando el delete generico: la UI apunta a una mutation gobernada
custom (`deleteLevelSchemeValidated`) via `customDeleteMutation` del layout, que borra explicitamente los
niveles hijos en orden FK-safe (ext RT, RT, base) y luego el `Scheme`, conservando el modal de impacto
del core. El fix de core permitiria retirar ese workaround y volver al delete generico (tarea T5).
