# BUG core: deleteBulkInstances bloquea el borrado de un objeto base por contar su propia proyeccion RecordType como referencia externa

> Registro de analisis (SP8). Fuente del incidente: reporte tecnico "bug de cascada al borrar Availability (RT)" (Laura Fierro, Core UP1, investigado 2026-08-05). Este documento verifica el reporte contra el codigo real, corrige la causa raiz, y define fix, malla de seguridad y plan de tests. No es un ticket: es el analisis previo que alimenta el ticket DKC.
>
> **Relacionado**: [[BUG-core-recordlist-harddelete-block-renders-as-load-error]] (mismo dominio: robustez del hard-delete en core). Este bug es backend (se bloquea lo que NO deberia); el hermano es frontend (un bloqueo legitimo se renderiza como error de carga full-view). Complementarios, tickets DKC separados. Ver seccion 10 del hermano para la comparativa.

- **Modulo**: object-manager core (motor de borrado + validacion de referencias)
- **Severidad**: media. No corrompe datos ni genera huerfanos. Bloquea de forma sistematica un borrado legitimo.
- **Alcance**: cualquier objeto base con extensiones RecordType cuyo FK de proyeccion siga la convencion `<baseLower>Id` (minuscula). No es exclusivo de Availability.
- **Estado**: RESUELTO (UPONE-1557 / TICKET-122, 2026-08-13). Fix Opcion A implementado en `object-manager/src/services/referenceValidationService.js`: `discoverFKRelationshipsFromPrisma` excluye las proyecciones RT propias (`rt__*__<base>` con PK == FK -> base.id), resueltas por introspeccion real de la PK/FK (no por string `rt__`), llevando el bulk a paridad con el single. Verificado contra BD real UPU (suite `hard-delete-cascade.integration.test.js`, 23/23 VERDE, incluye TC-1..TC-6). Nota de implementacion: `resolveRtProjectionFks` (el candidato de reuso del design) resulto ser un superconjunto que incluye rt__ AJENAS que referencian al base por una columna que no es su PK (verificado: OrgUnit devuelve `rt__InstructorAvailability__availability` y `rt__Departmental__InstructorAffiliation`); anclar en su set crudo habria violado REQ-REGRESSION-01, por eso la exclusion se refino a `PK == FK` (proyeccion propia 1:1) via introspeccion self-contained en el servicio, sin tocar `resolveRtProjectionFks` ni el delete-path (blast radius minimo).

---

## 1. Sintoma

Al intentar limpiar ~31.000 filas duplicadas de `InstructorAvailability` en el tenant de Continental (generadas por un ad-hoc de completitud de docentes, ya corregido aparte), el borrado se bloqueo de forma sistematica.

`deleteImpactPreview` sobre el objeto base `Availability` reporta que se puede borrar, sin restricciones:

```json
{ "status": "cascade", "totalCount": 0, "restrictions": [] }
```

Pero el borrado real (`deleteBulkInstances`) sobre esos mismos ids falla, TODOS con el mismo error:

```json
{
  "field": "availabilityId",
  "message": "Cannot delete: 1 Rt__InstructorAvailability__availability record(s) reference this Availability via field \"availabilityId\"",
  "type": "CONSTRAINT_VIOLATION"
}
```

Falla igual borrando por el nombre base (`Availability`) o por el nombre tecnico del RecordType (`rt__InstructorAvailability__availability`): UPONE-1479 resuelve el alias RT al objeto base antes de procesar, asi que ambos entrypoints terminan en el mismo camino.

---

## 2. Que paso (causa raiz precisa)

El bloqueo NO viene del motor de cascada. Viene de un gate distinto y anterior: `validateBulkDelete`, en `object-manager/src/services/referenceValidationService.js`.

### Flujo real de `deleteBulkInstances('Availability', ids)`

`Availability` no declara hijos y no tiene soft-delete. Su recorrido (en `object-manager/src/graphql/resolvers/instance.resolver.js`):

1. **Motor de cascada** (linea 5901). El gate `objectDeclaresChildren('Availability')` da `false` porque el JSON no declara `polymorphicChildren` / `directChildren` / `polymorphicChildrenDerived`. Devuelve `applied: false`. Se cae al path generico. Correcto.
2. **`validateBulkDelete`** (linea 5974). Llama a `findReferencingObjects` -> `discoverFKRelationshipsFromPrisma`, que busca todo modelo Prisma con un campo `availabilityId`. Encuentra las tablas de proyeccion RT (`rt__InstructorAvailability__availability`, `rt__StudentAvailability__availability`, etc.), las cuenta como referencias externas, y manda los ids a `blockedResults` con `CONSTRAINT_VIOLATION`. Nunca llegan a `deletableIds`.
3. **Loop de borrado** (linea 5998). Itera sobre `deletableIds`, que quedo vacio. Por eso NUNCA se ejecuta la limpieza de proyecciones RT que vive en la linea 6049 (`resolveRtProjectionFks` + `deleteMany` sobre las tablas `rt__`).

### La ironia tecnica

El path generico YA sabe borrar las capas RT (lineas 6047 a 6056: `resolveRtProjectionFks` resuelve la FK real por introspeccion y borra la proyeccion antes de la base). Pero `validateBulkDelete` corre ANTES y trata esas mismas FK de proyeccion como referencias externas bloqueantes, asi que el id nunca llega al codigo que las limpiaria.

### El defecto concreto

En `discoverFKRelationshipsFromPrisma` (`referenceValidationService.js:75-89`), la lista de exclusion cubre:

- el mismo objeto (linea 77)
- tablas `ext__` (linea 82)
- tablas `core_` (linea 87)

Pero NO excluye las proyecciones `rt__<Rt>__<base>` del propio objeto. Esas no son referencias externas: son capas del mismo registro logico, conectadas por la FK `<base>Id`, y ya las maneja `resolveRtProjectionFks` en el delete loop.

### El bug es solo de bulk. El singular ya funciona

Dato decisivo: `deleteInstance` (singular) SI borra `Availability` correctamente. Su path generico (`instance.resolver.js:4262-4307`) no hace pre-validacion de referencias: motor de cascada (se saltea, sin hijos) -> limpia proyecciones RT (linea 4280) -> borra ext -> borra base. Es decir, borra la capa `rt__` primero y luego la base. Sin bloqueo.

`deleteBulkInstances` mete el pre-gate `validateBulkDelete` ANTES de esa limpieza, y ahi se cae.

Consecuencia: ya existe en produccion un path (singular) que borra estos objetos sin contar la proyeccion como referencia, y funciona. El reporte se equivoca al afirmar "cualquier objeto base usado como RT nunca se puede borrar por la via generica": el singular si; el bulk no.

---

## 3. Por que el preview dice "cascade" y el borrado bulk falla

Son DOS motores de deteccion de referencias distintos, con semantica diferente, que no coinciden:

- `deleteImpactPreview` corre `buildDeleteImpactPlan` -> `detectRestrictions` -> `findIncomingReferences` (en `deleteImpactPlan.js`). Este excluye correctamente las capas de proyeccion (por eso reporta `restrictions: []`, `totalCount: 0`).
- El borrado real bulk usa `validateBulkDelete` (en `referenceValidationService.js`), que NO las excluye.

El preview no miente por casualidad: usa la logica correcta. El que esta mal es `validateBulkDelete`. La divergencia preview vs ejecucion es el problema arquitectonico de fondo, y esta ahi por diseno: el comentario en `deleteImpactPlan.js:706-707` dice explicitamente que el delete real usa `parseDeleteError` + `validateBulkDelete` (que tiene cache FK), y que `findIncomingReferences` del motor es solo para preview. Se aceptaron dos implementaciones para preservar el cache de performance en bulk.

### Matriz de capacidades de los dos motores

| Detecta | Motor / preview (`findIncomingReferences`) | `validateBulkDelete` (ejecucion bulk) |
|---|---|---|
| FK por convencion `<base>Id` | Si | Si |
| Custom fields (`core_FieldDefinition` reference) | Si | Si |
| Referencias polimorficas `ownerType/ownerId` | Si | No |
| Cadenas de version (`previousVersionId`) | Si | No |
| Excluye hijos del propio subarbol | Si (`subtreeKeys` + `filterExternal`) | No (chequeo plano por id) |
| Excluye proyeccion `rt__` propia | Si (empirico) | No (este es el bug) |
| Cache de relaciones FK | No (scan por-nodo sobre todos los modelos) | Si (`fkRelationshipCache`, TTL) |

El motor es superavit en deteccion, pero deficitario en performance de bulk (escanea `count` + `findMany` sobre cada modelo Prisma, por cada nodo, sin cache).

---

## 4. Por que no lo vimos antes

Se necesita la interseccion de tres condiciones poco frecuentes:

1. Un objeto BASE que declara CERO hijos, y
2. tiene extensiones RecordType (tablas `rt__*__base` con FK `<base>Id`), y
3. alguien hace un delete a nivel base en BULK de esas filas.

El uso normal borra por el alias RT, y aunque UPONE-1479 resuelve RT a base, el disparador real (limpiar ~31k filas duplicadas a nivel base, en bulk) es un caso ad-hoc que nadie habia ejecutado. El singular funciona, asi que el sintoma no aparecia por la UI de borrado fila a fila.

### La razon fina: coincidencia de casing en el fixture de test que deberia protegernos

Existe cobertura del caso "base sin hijos + proyeccion RT en bulk": el test `OrgUnit(Campus)` en `hard-delete-cascade.integration.test.js:740` ("RT bulk borrar por rt__Campus__OrgUnit (objeto sin hijos declarados) borra base + proyeccion RT sin regresion"). Ese test pasa. Es el analogo estructural EXACTO del bug de Availability. Y sin embargo el bug esta vivo.

La diferencia esta en el CASING de la FK de proyeccion:

- `rt__Campus__OrgUnit` usa FK `OrgUnitId` (O mayuscula).
- Al borrar, UPONE-1479 reasigna `objectType = 'OrgUnit'` (`instance.resolver.js:5857`), asi que `validateBulkDelete` recibe `'OrgUnit'`.
- `discoverFKRelationshipsFromPrisma` arma `expectedFK = 'orgUnitId'` (o minuscula, por `charAt(0).toLowerCase()`).
- Escanea `rt__Campus__OrgUnit` con `select: { orgUnitId: true }` (minuscula). La columna real es `OrgUnitId` (mayuscula). Prisma lanza "unknown field" -> el `catch` de linea 125-128 lo traga -> el modelo se SALTA -> no se cuenta como referencia -> no bloquea. El test pasa.

En cambio `Availability`:

- `rt__StudentAvailability__availability` (e `InstructorAvailability`, `ResourceAvailability`) usan FK `availabilityId` (minuscula, la convencion).
- `expectedFK = 'availabilityId'` MATCHEA la columna real -> se detecta -> se bloquea.

Es decir: el test cubre el caso, pero con un fixture cuya FK capitalizada esquiva por accidente el scan buggeado. El unico casing que rompe (minuscula, la convencion) es el que ningun test ejercita. El test da falso verde. Es el mismo patron que ya documentamos: los tests que "pasan" pueden estar consagrando un bug de runtime porque el fixture evita la ruta que falla.

---

## 5. Soluciones posibles

### Opcion A: excluir las proyecciones RT propias en `validateBulkDelete` (causa raiz, recomendada)

En `discoverFKRelationshipsFromPrisma`, agregar a la lista de exclusion (junto a `ext__` / `core_` / self) los modelos que sean proyeccion RT del propio target: el set exacto que devuelve `resolveRtProjectionFks(prisma, modelName)`, que introspecta la FK real por casing en vez de adivinar `${base}Id`.

- **Pros**: corrige la causa real; deja consistente el path generico para TODOS los base con RT sin tocar JSON; alinea `validateBulkDelete` con lo que single-delete, el motor y el preview ya hacen; cero deuda per-objeto; agnostico al casing (introspeccion, no convencion).
- **Contras**: no cierra la divergencia amplia preview vs ejecucion (polimorficas, version-chain, subarbol siguen difiriendo). Esos gaps quedan latentes.
- **Esfuerzo**: bajo, ~0.5 a 1 dia con test de integracion contra BD real.

### Opcion B: apuntar `deleteBulkInstances` al motor del preview (unificacion literal, NO recomendada)

Reemplazar `validateBulkDelete` por `buildDeleteImpactPlan` / `detectRestrictions` en el path de ejecucion bulk.

- **Pros**: elimina la divergencia; una sola deteccion.
- **Contras**:
  1. Regresion de performance en el escenario que disparo el bug (bulk de ~31k): el motor no tiene cache FK y hace O(modelos x nodos) queries. Es justo donde peor escala.
  2. Regresion de comportamiento: el motor aplica semantica que hoy el path bulk no aplica (restriccion por polimorficas, por cadena de version, exclusion de subarbol). Objetos que hoy se borran por la via generica podrian empezar a bloquearse o al reves.
  3. La exclusion `rt__` del motor es en parte accidental (depende de que la tabla de proyeccion use `<base>Id` como PK y de que `select: { id }` falle silencioso). Construir la fuente de verdad sobre eso sin endurecerlo antes es fragil.
  4. Contradice el gate de performance del propio motor y la decision de diseño de `deleteImpactPlan.js:706-707`.
- **Esfuerzo**: medio-alto, ~3 a 5 dias. Riesgoso.

### Opcion B': modulo unico de deteccion compartido (el fix "mayor" correcto, follow-up)

Si algun dia se quiere una sola fuente de verdad, la jugada NO es el swap de B, es extraer un unico modulo de deteccion de referencias que combine el cache FK de `validateBulkDelete` con la semantica completa del motor (polimorficas, version, subarbol, proyeccion), y que lo consuman preview y ejecucion por igual. Cierra la divergencia sin perder cache.

- **Pros**: elimina de raiz la clase de bug "el preview dice una cosa y la ejecucion otra"; una sola implementacion que mantener.
- **Contras**: refactor transversal, superficie de regresion amplia, requiere matriz de tests que hoy no existe.
- **Esfuerzo**: alto, ~3 a 5 dias. Follow-up de deuda tecnica, no respuesta a este incidente.

---

## 6. Por que A es mejor que B (aunque B parezca "mas consistente")

"Mayor" no es "mejor" aca. B es mas consistente en el papel pero pierde en lo que importa:

- **Escalabilidad**: A no toca la performance (mantiene el cache FK). B la degrada justo en el peor caso (bulk masivo).
- **Riesgo**: A solo remueve del set de "referencias" las proyecciones RT del propio objeto. Todo lo demas que `validateBulkDelete` ya detecta (FK externa real, custom fields) queda intacto. B cambia la semantica de bloqueo para muchos objetos a la vez.
- **Evidencia de correctitud**: single-delete ya borra estos objetos sin contar la proyeccion, en produccion, sin incidentes. A solo lleva bulk a paridad con single. No es un cambio especulativo: es alinear dos paths que deberian coincidir.
- **Reversibilidad**: A es una exclusion localizada y facil de revertir. B es un reemplazo de motor.

Recomendacion: **A ahora**, con **B' anotado como follow-up de deuda tecnica**. Descartar B (el swap literal).

---

## 7. Malla de seguridad: que NO se puede romper al implementar A

`validateBulkDelete` protege casos vivos que deben seguir bloqueando. La exclusion de A debe ser quirurgica:

1. **FK externa real** debe seguir bloqueando (ej. `Event.activityId` referenciando `Activity`; `planEntry.availabilityId` si existiera un objeto externo que referencie Availability).
2. **Custom field reference** (`core_FieldDefinition` con `fieldType='reference'`) debe seguir bloqueando.
3. **Exclusion `ext__` / `core_` / self**: intacta.
4. **Precision del match**: excluir SOLO `rt__<Rt>__<esteObjectLower>` (proyeccion del objeto que se borra), NO una `rt__` de OTRO objeto que legitimamente tenga una FK a este. Por eso hay que anclar en el set exacto de `resolveRtProjectionFks(prisma, modelName)` (introspeccion de la FK real), NO en un patron de string suelto tipo "cualquier tabla que empiece con `rt__`".
5. **Paridad con single**: single-delete debe seguir limpiando proyecciones igual. No se toca, pero es el oraculo de que A es correcto: bulk debe terminar comportandose como single.
6. **Casing-agnostico**: la exclusion debe funcionar tanto para FK convencion minuscula (`availabilityId`) como capitalizada (`OrgUnitId`, `ActivityId`). `resolveRtProjectionFks` ya introspecta el casing real, asi que anclarse en su output cubre ambos.

---

## 8. Analisis de tests

### 8.1 Cobertura existente

| Test | Que cubre | Ruta que ejercita |
|---|---|---|
| `hard-delete-cascade.integration.test.js` (BD real UPU) | CASCADE de objetos con hijos, RESTRICT por FK externa, entrypoints RT (UPONE-1479), y el caso base-sin-hijos + RT (OrgUnit) | Mayormente el MOTOR (objetos que declaran hijos). El caso OrgUnit es el unico que toca el path generico + `validateBulkDelete` |
| `deleteImpactPlan.test.js` (unit) | Construccion del plan y `detectRestrictions` del motor | El MOTOR (no el path buggeado) |
| `softDeleteImpactPreview.test.js`, `executeSoftDeletePlan.test.js` | Soft-delete | No aplica al hard-delete generico |

### 8.2 Por que la cobertura actual NO nos protege

Dos huecos, en lados opuestos:

- **No caza el bug**: el unico test del caso base-sin-hijos + proyeccion RT en bulk (`OrgUnit`, linea 740) pasa por coincidencia de casing (FK `OrgUnitId` capitalizada esquiva el scan minuscula). Ningun test ejercita una FK de proyeccion con la convencion minuscula (`availabilityId`), que es la que rompe. Falso verde.
- **No protege el bloqueo legitimo por el path generico**: TODOS los tests de RESTRICT por FK externa usan objetos que declaran hijos, asi que corren por el MOTOR (devuelven `DELETE_RESTRICTED`), no por `validateBulkDelete` (que devuelve `CONSTRAINT_VIOLATION`). La deteccion de referencia externa real de `validateBulkDelete` para objetos SIN hijos no tiene NINGUN test. Si A rompiera esa deteccion, ningun test lo caza.

Ademas, `validateBulkDelete` / `findReferencingObjects` / `discoverFKRelationshipsFromPrisma` no tienen NINGUN test unitario directo. Su comportamiento solo se ejercita indirecto, por integracion, y justo por los caminos que esquivan el defecto.

### 8.3 Tests nuevos a implementar

Nota transversal: por la naturaleza del defecto (introspeccion de modelos Prisma reales + casing de columnas), el guard autoritativo es INTEGRACION contra BD real. Un unit con Prisma mockeado puede volver a consagrar el bug (el mock no reproduce el casing real ni el fallo silencioso de `select`). Los unit sirven de complemento barato, no de reemplazo.

**Para cazar el bug y validar A (RED hoy, GREEN tras el fix):**

1. **Bulk, base sin hijos, FK de proyeccion minuscula (el caso Availability), sin referencia externa**: `deleteBulkInstances({ objectType: <base>, ids })` sobre un base que no declara hijos y tiene una proyeccion `rt__*__<base>` con FK convencion minuscula. Debe borrar base + todas las capas de proyeccion, `errors: []`, sin bloqueo. Fixture tipo `Availability` / `StudentAvailability` (`availabilityId`). FALLA hoy, PASA con A.
2. **Single equivalente (guard de no-regresion)**: mismo fixture por `deleteInstance`. Debe seguir borrando (ya funciona hoy). Asegura que A no rompe la paridad.

**Para proteger lo que ya funciona (malla de seguridad de A):**

3. **Bulk, base sin hijos, referenciado por objeto EXTERNO real**: base sin hijos que SI es referenciado por otro objeto (FK real, no su propia proyeccion). Debe seguir bloqueando con el mensaje de referencia. Cubre el hueco 8.2 (segundo bullet): hoy no hay test del RESTRICT de `validateBulkDelete` para objetos sin hijos.
4. **Precision del match (base con proyeccion propia + tercer objeto que es `rt__` de OTRA cosa y referencia al base)**: borrar el base debe excluir SU proyeccion pero seguir bloqueando por el `rt__` ajeno que lo referencia legitimamente. Asegura que la exclusion no sobre-matchea "cualquier `rt__`".
5. **Matriz de casing**: cubrir explicitamente FK de proyeccion minuscula (`availabilityId`) Y capitalizada (`OrgUnitId`) para el caso base-sin-hijos en bulk. El de capital ya existe (OrgUnit, linea 740); falta el minuscula, que es el critico. Documenta que el fix es casing-agnostico.

**Para proteger lo que se implemente a futuro (si se aborda B'):**

6. **Test de propiedad "sin divergencia" preview vs ejecucion**: sobre un set de fixtures (base sin hijos + RT, base con hijos, base con referencia externa, base con version-chain), afirmar que `deleteImpactPreview` y el resultado real de `deleteBulkInstances` COINCIDEN en status y en el conjunto de bloqueos. Este test habria cazado el bug original (preview dice cascade, ejecucion bloquea = divergencia). Es el guard de mas alto valor si se persigue la unificacion; convierte la clase entera de bug en algo detectable.

**Unit directo (complemento barato):**

7. Unit de `discoverFKRelationshipsFromPrisma` / `findReferencingObjects` con un cliente Prisma de prueba: afirmar que excluye `rt__*__<target>` propias, `ext__`, `core_` y self, y que PRESERVA FK externas reales y custom fields. Guarda la funcion exacta que se toca. No sustituye a los de integracion.

---

### 8.4 Orden de implementacion: los tests primero

La implementacion del fix NO arranca por el fix. Arranca por los tests, en este orden:

1. **Asegurar lo que ya se tiene (antes de tocar nada)**: implementar y correr en VERDE los tests de la malla de seguridad sobre el codigo ACTUAL, sin modificarlo. Son los que hoy no existen y protegen el comportamiento que debe sobrevivir al fix:
   - test 3 (bloqueo legitimo por FK externa real en base sin hijos, via `validateBulkDelete`),
   - test 4 (precision del match: no sobre-excluir `rt__` ajenas),
   - test 2 (single sigue borrando),
   - test 5 caso capitalizado (OrgUnit, que ya existe y ya pasa).
   Estos deben quedar VERDES contra el codigo sin cambios. Si alguno sale rojo aca, significa que asumimos mal el comportamiento actual y hay que revisar el diagnostico antes de seguir. Esta es la red que garantiza que el fix no rompe lo que hoy funciona.

2. **Escribir el test que falla (RED del bug)**: recien despues, agregar el test 1 (bulk, base sin hijos, FK de proyeccion minuscula, sin referencia externa) y el test 5 caso minuscula. Deben salir ROJOS contra el codigo actual. Ese rojo es la prueba reproducible del bug (evidencia runtime real, no teorica) y el criterio objetivo de "arreglado".

3. **Implementar el fix (Opcion A)**: la exclusion quirurgica en `discoverFKRelationshipsFromPrisma`. El fix esta listo cuando los tests del paso 2 pasan a VERDE y los del paso 1 SIGUEN en verde (no hubo regresion).

4. **Cerrar**: correr la suite completa de `hard-delete-cascade.integration.test.js` y el unit nuevo (test 7). Ningun test previo puede quedar rojo.

Justificacion del orden: el diagnostico de este documento es un self-report hasta que un test rojo lo reproduce contra la BD real. Escribir primero la red de seguridad (paso 1) evita que el fix "arregle" el sintoma rompiendo un bloqueo legitimo sin que nos enteremos, que es precisamente el riesgo de tocar una funcion (`validateBulkDelete`) que hoy no tiene tests directos. El fix se implementa sobre una malla ya verde, no sobre codigo a ciegas.

---

## 9. Limpieza de las ~31k filas de Continental

No requiere esperar al fix. No generan conflicto funcional (disponibilidad redundante). Se limpian con un script one-off en transaccion que borre primero la capa `rt__` y luego la fila base, que es exactamente lo que single-delete ya hace fila por fila. Una vez que aterrice A, el borrado bulk estandar por API las maneja solo.

---

## 10. Referencias de codigo

- `object-manager/src/services/referenceValidationService.js`
  - `discoverFKRelationshipsFromPrisma` (linea 62): scan de FK por convencion. Exclusion incompleta en lineas 75-89 (falta `rt__` propia). **Punto del fix A.**
  - `validateBulkDelete` (linea 297), `checkInstanceReferences` (linea 250), `parseDeleteError` (linea 383)
- `object-manager/src/graphql/resolvers/instance.resolver.js`
  - `resolveRtProjectionFks` (linea 44): introspeccion de la FK real de proyeccion. **Fuente de verdad para la exclusion de A.**
  - `deleteBulkInstances` (linea 5814): reruteo RT a base (5857), gate de cascada (5901), `validateBulkDelete` (5974), limpieza de proyeccion RT (6049)
  - `deleteInstance` (linea 4126): path singular que ya funciona (limpieza de proyeccion en 4280)
- `object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js`
  - `buildDeleteImpactPlan` (947), `detectRestrictions` (569), `findIncomingReferences` (709): motor del preview (semantica completa, sin cache). Nota de diseño de la divergencia en 706-707
- `object-manager/tests/integration/hard-delete-cascade.integration.test.js`
  - Caso OrgUnit sin hijos (740, 753): falso verde por casing capitalizado
- `mods/uengagement-up1/objects/Availability.json`: base sin hijos declarados
- `mods/uengagement-up1/objects/RecordTypes/rt__StudentAvailability__Availability.json`: proyeccion RT con FK `availabilityId` (convencion minuscula)
- Doc del motor: `object-manager/docs/features/delete-cascade.md`
- Relacionado: `deckard/projects/up1/kb/sp7/BUG-core-harddelete-recordtype-entrypoint-cascade.md` (UPONE-1479, reruteo RT a base)
