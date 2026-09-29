# Modelo de datos — TICKET-145: Migracion server-side de invariantes de Curriculum Design (camino A)

## 0. Resumen ejecutivo del impacto en datos

Este ticket es **primariamente de enforcement, no de modelado**. La mayoria de los REQs mueven logica de negocio del cliente al override del resolver sin tocar el esquema. Sin embargo, hay **tres puntos de impacto real en el modelo de datos** y **dos de forma condicional**:

| # | Impacto | REQ | Naturaleza | Requiere migracion DB |
|---|---|---|---|---|
| 1 | Unicidad `(planId, activityId)` en `PlanEntry` | REQ-03 | Indice unico **nuevo** (condicional) | Si, si gana la via constraint |
| 2 | Normalizacion explicita de la base de `position` (0-based) | REQ-06 | Convencion + posible backfill correctivo | Solo si hay datos fuera de convencion |
| 3 | Contenido HTML de `CustomSection` sanitizado en el write | REQ-07 | Cambia el **invariante de contenido** de un campo existente; datos historicos quedan sin sanitizar | Opcional (backfill de datos historicos) |
| 4 | Enum de `code` de error de dominio compartido por las tres vias | REQ-10 | Contrato de error, no persistencia | No |
| 5 | `progression` de `Plan` + proyeccion `rt__Plan__curriculum` | REQ-08 | Mismo dato, dos paths de escritura; **no se agrega campo** | No (prohibido upsert de la proyeccion en update base-only) |

**Nada de este ticket crea entidades nuevas.** El unico objeto de esquema potencialmente nuevo es un indice unico, y su existencia esta condicionada al resultado de la verificacion contra datos reales de UPU (REQ-03).

> Todos los `file:line` y nombres de campo se marcan como **A CONFIRMAR en F0** cuando dependen del codigo del submodulo `mods/curriculum-design`, que a la fecha de este documento no esta materializado ni con el watermark refrescado (`8a151e7`).

---

## 1. Entidades afectadas

### 1.1 `PlanEntry` — EXISTENTE (entidad central del ticket)

Es la entidad que concentra REQ-02, REQ-03, REQ-04, REQ-05 y REQ-06. Todo lo que sigue es campo existente salvo lo marcado.

| Campo | Tipo | Obligatorio | FK / Enum | Default | Estado | REQ que lo toca | Nota |
|---|---|---|---|---|---|---|---|
| `id` | ID | Si | PK | autogen | EXISTENTE | — | — |
| `planId` | ID | Si | FK → `Plan.id` (Curriculum) | — | EXISTENTE | REQ-02, REQ-03, REQ-05, REQ-06 | Discriminante del scope de todos los guards. Es la clave por la que el guard de estado resuelve el `Plan` padre y por la que el guard de unicidad y el renumerado acotan su universo. |
| `activityId` | ID | Si (A CONFIRMAR) | FK → `Activity.id` | — | EXISTENTE | REQ-03 | Segundo componente de la unicidad nueva. **Confirmar en F0 si es nullable**: si lo es, la semantica de unicidad debe definirse para NULLs (ver 3.1). |
| `period` | Int | Si (A CONFIRMAR) | — | A CONFIRMAR | EXISTENTE | REQ-05, REQ-06 | Agrupador del renumerado. El renumerado es **acotado a period origen + period destino**, no a la malla completa. |
| `position` | Int | Si (A CONFIRMAR) | — | A CONFIRMAR | EXISTENTE | REQ-05, REQ-06 | **0-based en `CurriculumMesh`** (RULE-curriculum-design-041). No heredar la base de `CompositeSectionTree`. Ver 4.2: la convencion se documenta y se valida, no se cambia el tipo. |
| `isElective` (nombre A CONFIRMAR) | Boolean | Si (A CONFIRMAR) | — | `false` (A CONFIRMAR) | EXISTENTE | REQ-04 | Antecedente de la regla de forma: si es `true`, el campo de bloque pasa a ser **obligatorio de facto** (obligatoriedad condicional, no de schema). |
| `blockId` / `block` (nombre y forma A CONFIRMAR) | ID o String | No (nullable en schema) | FK → objeto de bloque (A CONFIRMAR si es FK o string libre) | `null` | EXISTENTE | REQ-04 | **Punto critico de modelado**: sigue siendo nullable en el esquema porque las entradas no-electivas legitimamente no tienen bloque. La obligatoriedad es **condicional y aplicativa**, no declarativa. Ver 4.1. |
| `credits` (nombre A CONFIRMAR) | Int o Decimal | A CONFIRMAR | — | A CONFIRMAR | EXISTENTE | REQ-04 | Nuevo invariante de rango: `>= 0`. Ver 4.1 y la nota sobre el guard preexistente `assertCreditRangeOnUpdate` en 6.2. |
| resto de campos | — | — | — | — | EXISTENTE | — | Sin cambios. |

**Ningun campo nuevo en `PlanEntry`.** Los cinco REQs que la tocan operan sobre campos ya existentes; lo que cambia es **donde** se valida (override del resolver) y **si** hay un indice que lo respalde.

---

### 1.2 `Plan` (Curriculum) — EXISTENTE

Portadora del estado que habilita o bloquea la edicion de la malla (REQ-02) y del campo cuyo cambio se restringe (REQ-08).

| Campo | Tipo | Obligatorio | FK / Enum | Default | Estado | REQ que lo toca | Nota |
|---|---|---|---|---|---|---|---|
| `id` | ID | Si | PK | autogen | EXISTENTE | — | — |
| `state` / `status` (nombre A CONFIRMAR) | Enum de estado del plan | Si | Enum (A CONFIRMAR: valores exactos y si `Draft` es literal) | A CONFIRMAR | EXISTENTE | REQ-02 | **Antecedente del guard A-CD-1.** El guard lee este campo del `Plan` padre, no del `PlanEntry`. Implica que **toda** mutacion de `PlanEntry` necesita resolver su `Plan` para decidir. Ver 5.1 (costo de lectura) y 4.3. |
| `progression` | A CONFIRMAR (enum o String) | A CONFIRMAR | A CONFIRMAR | A CONFIRMAR | EXISTENTE | REQ-08 | Su cambio esta prohibido si la malla no esta vacia. Hoy el guard corre solo en la rama `!RT_PATTERN`; REQ-08 lo extiende al path `rt__Plan__curriculum`. **No se agrega ni se modifica el campo**: se corrige el alcance del guard. |

**Sin campos nuevos.** REQ-08 no es un cambio de modelo: es un cambio de cobertura de guard sobre un campo existente que hoy tiene **dos caminos de escritura** para el mismo dato (ver 4.4, que es el punto de modelado relevante del REQ-08).

---

### 1.3 `CustomSection` — EXISTENTE

| Campo | Tipo | Obligatorio | FK / Enum | Default | Estado | REQ que lo toca | Nota |
|---|---|---|---|---|---|---|---|
| `id` | ID | Si | PK | autogen | EXISTENTE | — | — |
| campo de contenido HTML (nombre A CONFIRMAR: `content` / `html` / `body`) | String / Text | A CONFIRMAR | — | A CONFIRMAR | EXISTENTE | REQ-07 | **Cambio de invariante de contenido, no de tipo.** El tipo y la nulabilidad no cambian; lo que cambia es que a partir de F4 el valor persistido esta garantizado como HTML de whitelist. Ver 4.5 y la nota de migracion 7.3 (datos historicos). |
| FK al owner de la seccion (A CONFIRMAR) | ID | A CONFIRMAR | FK (A CONFIRMAR) | — | EXISTENTE | — | Sin cambios. |

**Sin campos nuevos.** Decision de modelado a tomar explicitamente en F4: **no** se agrega un campo `sanitizedAt` / `sanitizerVersion`. Ver 4.5 para el razonamiento y la alternativa descartada.

---

### 1.4 `SyllabusOffering` — EXISTENTE

| Campo | Tipo | Obligatorio | FK / Enum | Default | Estado | REQ que lo toca | Nota |
|---|---|---|---|---|---|---|---|
| todos | — | — | — | — | EXISTENTE | REQ-09 | **Cero impacto en modelo de datos.** REQ-09 agrega el wrapper `withObjectAuth` a `createSyllabusOffering`. Es un cambio de capa de autorizacion: no altera campos, tipos, indices ni relaciones. Se lista aqui solo para dejar constancia de que fue evaluado y descartado como cambio de esquema. |

---

### 1.5 `Requirement` / arbol de requisitos — EXISTENTE (solo lectura)

REQ-05 (borrado seguro, A-CD-3) **lee** este subgrafo; no lo modifica.

| Elemento | Estado | Uso en este ticket | Nota |
|---|---|---|---|
| Entidad(es) de `Requirement` del plan | EXISTENTE | Lectura por lote | El guard de borrado carga el **conjunto de requirements del plan afectado** en una sola pasada, no por fila del batch. |
| Estructura de arbol Y/O (nodos y conectores) | EXISTENTE | Lectura recursiva | **PROHIBIDO aplanar el arbol a lista** (RULE-curriculum-design-033). El guard reusa `buildRequirementTree`/`assembleRequirementTree` + `evaluateRequirementTree.logic` de forma recursiva y fiel. |
| Relacion `Requirement` → `Activity` / `PlanEntry` (forma exacta A CONFIRMAR) | EXISTENTE | Lectura | Es la relacion por la que el borrado de un `PlanEntry` puede dejar un requisito insatisfacible. **Confirmar en F0** si el requisito referencia la `Activity` o la entrada del plan: de eso depende si borrar una entrada duplicada (pre-unicidad) rompe o no un requisito. |

**Sin cambios de esquema.** El requisito de performance de REQ-05 ("no N+1 por entrada del lote") es una restriccion de **patron de acceso**, no de modelo; si la lectura por lote resulta inviable con la forma actual de la relacion, eso se reporta en F2 como hallazgo, no se resuelve agregando campos denormalizados sin aprobacion.

---

## 2. Relaciones (ninguna nueva)

```
Plan (Curriculum)
 │  state ──────────────► antecedente del guard A-CD-1 (REQ-02)
 │  progression ───────► restringido por A-CD-7 (REQ-08), dos paths de escritura
 │
 ├─1..N─► PlanEntry
 │          │ planId     ──► scope de unicidad (REQ-03) y del renumerado (REQ-06)
 │          │ activityId ──► 2do componente de la unicidad (REQ-03)
 │          │ period     ──► agrupador del renumerado, acotado (REQ-06)
 │          │ position   ──► 0-based en CurriculumMesh (REQ-06)
 │          │ isElective + blockId ──► par de la regla de forma (REQ-04)
 │          │ credits    ──► rango >= 0 (REQ-04)
 │          │
 │          └──► Activity (N..1)   [existente, sin cambios]
 │
 └─1..N─► Requirement (arbol Y/O)  [existente, solo lectura en REQ-05]
              └─► referencia a Activity/PlanEntry (forma A CONFIRMAR en F0)

CustomSection
 └─ campo HTML ──► sanitizado en el write (REQ-07); tipo sin cambios

SyllabusOffering
 └─ sin impacto de modelo (REQ-09 es capa de autorizacion)
```

**Cardinalidades, FKs y `onDelete` existentes: sin cambios.** En particular, REQ-05 **no** se implementa como `onDelete: RESTRICT` a nivel de FK: la condicion de rechazo no es "existe una referencia" sino "el arbol Y/O queda insatisfacible", que es una evaluacion de dominio irreducible a una restriccion referencial. Ver 6.1.

---

## 3. Indices

### 3.1 Unicidad `(planId, activityId)` en `PlanEntry` — **NUEVO (condicional)** — REQ-03

Es el unico objeto de esquema potencialmente nuevo del ticket. Su forma final depende de una verificacion que ocurre **antes** de escribir la migracion.

**Verificacion previa obligatoria (F1, antes de decidir):** contar duplicados preexistentes en datos reales de UPU.

```sql
-- Duplicados preexistentes de (planId, activityId) en PlanEntry.
-- Confirmar nombres reales de tabla y columnas en F0.
SELECT "planId", "activityId", COUNT(*) AS n
FROM "PlanEntry"
GROUP BY "planId", "activityId"
HAVING COUNT(*) > 1
ORDER BY n DESC;
```

Segun el resultado, dos vias mutuamente excluyentes. **La decision es del dev y debe registrarse** (REQ-03 lo exige explicitamente):

| | Via A — constraint de schema | Via B — guard aplicativo |
|---|---|---|
| **Cuando aplica** | El conteo devuelve 0 filas | El conteo devuelve ≥ 1 fila |
| **Objeto de datos** | `@@unique([planId, activityId])` en el modelo `PlanEntry` → indice unico **nuevo** | Ningun objeto nuevo. Ver indice de soporte abajo |
| **Donde vive el invariante** | Motor de DB | Override `createInstance`/`updateInstance` de `PlanEntry` (single y batch) |
| **Pro** | Infalsificable por definicion, incluso ante escritura directa a DB o un futuro path que evada el override | No rompe datos existentes; deployable de inmediato |
| **Contra** | La migracion **falla** si hay duplicados; obliga a decidir remediacion de datos historicos (fuera del alcance declarado de este ticket) | Hay una ventana de carrera bajo concurrencia (dos inserts simultaneos pueden pasar ambos el check); mitigable con la transaccion de REQ-06 pero no eliminada. Y no cubre escritura directa a DB |
| **Riesgo declarado en el ticket** | "puede rechazar datos existentes" — riesgo explicito del ticket | Deja el invariante dependiente de que **todo** path pase por el override |

**Indice de soporte, necesario en AMBAS vias:**

```prisma
// NUEVO si no existe ya un indice con (planId, activityId) como prefijo.
// Confirmar en F0 los indices vigentes de PlanEntry antes de crearlo.
@@index([planId, activityId])
```

Razon: en la via B el guard hace una lectura por `(planId, activityId)` en cada create/update, y en el camino batch esa lectura se repite por el conjunto del lote. Sin indice de cobertura, el guard degrada a scan por plan. En la via A el `@@unique` **ya provee** el indice y no hay que agregar nada.

**Semantica de NULL a confirmar en F0:** si `activityId` es nullable, un `@@unique([planId, activityId])` en Postgres **no** bloquea multiples filas con `activityId IS NULL` (los NULLs no colisionan). Si el dominio admite entradas sin actividad, ese comportamiento probablemente sea el deseado; si no lo es, hay que decidir entre hacer `activityId` obligatorio (cambio de esquema mayor, fuera de alcance) o cubrir el caso NULL en el guard aplicativo. **Confirmar antes de escribir la migracion.**

**Contrato del mensaje de error (REQ-03, no negociable):** el mensaje user-facing debe terminar con el formato Prisma literal

```
Unique constraint failed on the fields: (`activityId`)
```

para que mapee al friendly-error existente (RULE-curriculum-design-005). Esto tiene una consecuencia de diseño concreta: **en la via B, el guard aplicativo debe emitir ese string manualmente**, imitando el formato que en la via A produciria el motor. El nombre exacto del campo dentro de los backticks debe coincidir con lo que espera el friendly-error — **confirmar en F0 leyendo el mapeo del friendly-error**, no asumir `activityId`.

---

### 3.2 Indice de soporte para el renumerado — **NUEVO (probable)** — REQ-06

```prisma
// NUEVO si no existe. Confirmar indices vigentes en F0.
@@index([planId, period, position])
```

`movePlanEntry` lee y reescribe el conjunto de entradas del `period` origen y del `period` destino ordenadas por `position`, dentro de una transaccion. Un indice `(planId, period, position)` sirve tanto la lectura ordenada del rango como el acotamiento del renumerado a los dos periods involucrados.

**Nota importante sobre la unicidad previa:** el ticket menciona que la semantica de unicidad podria estar hoy en `(planId, period, position)` y que REQ-03 la mueve a `(planId, activityId)`. Esto hay que desambiguar en F0, porque **no son intercambiables**:

- `(planId, activityId)` unico ⇒ una actividad no se repite en el plan. Es lo que pide REQ-03.
- `(planId, period, position)` unico ⇒ no hay dos entradas en la misma casilla de la malla. Es lo que **protege el renumerado** de REQ-06.

Si hoy existe un unique en `(planId, period, position)`, **no debe eliminarse** al agregar el de REQ-03: cumplen funciones distintas y el ticket no pide quitarlo. Y si existe, tiene una consecuencia directa sobre REQ-06: un renumerado que reasigna posiciones **dentro de una transaccion** puede violar transitoriamente el unique si las escrituras se aplican en orden desfavorable (p.ej. mover la entrada 2 a la posicion 3 cuando 3 esta ocupada, antes de haber corrido la 3). Esto **no** es un problema de modelo sino de estrategia de escritura, y hay que resolverlo en F3 con una de estas opciones (a elegir en su momento):

| Opcion | Como | Costo |
|---|---|---|
| Orden de escritura seguro | Aplicar los updates en el orden que nunca colisione (descendente al abrir hueco, ascendente al cerrarlo) | Ninguno; requiere cuidado en la implementacion |
| Constraint diferida | `DEFERRABLE INITIALLY DEFERRED` en el unique, para que se chequee al commit | Cambio de migracion; no todo ORM lo expone limpiamente |
| Parking temporal | Mover a posiciones negativas o a un rango libre y luego reasignar | Dos pasadas de escritura; mas lento |

**Recomendacion:** orden de escritura seguro. No requiere cambio de esquema, es reversible y no introduce comportamiento de constraint que otros paths tendrian que conocer. Se documenta como decision en F3.

---

### 3.3 Resumen de indices

| Indice | Entidad | Estado | REQ | Condicion |
|---|---|---|---|---|
| `@@unique([planId, activityId])` | `PlanEntry` | **NUEVO** | REQ-03 | Solo via A (cero duplicados preexistentes) |
| `@@index([planId, activityId])` | `PlanEntry` | **NUEVO** | REQ-03 | Solo via B (redundante en via A) |
| `@@index([planId, period, position])` | `PlanEntry` | **NUEVO** (probable) | REQ-06 | Si no existe ya; confirmar en F0 |
| `@@unique([planId, period, position])` | `PlanEntry` | EXISTENTE (a confirmar) | REQ-06 | **No eliminar**; interactua con el renumerado (ver 3.2) |
| indice por `planId` | `PlanEntry` | EXISTENTE (a confirmar) | REQ-05 | Soporta la lectura por lote del guard de borrado |
| indices de `Requirement` | `Requirement` | EXISTENTE | REQ-05 | Confirmar en F2 que soportan la carga por lote sin N+1 |

---

## 4. Restricciones de dominio que NO se declaran en el esquema

Esta seccion es el nucleo del modelo de datos de este ticket: **la mayoria de los invariantes migrados son restricciones que el esquema relacional no puede expresar**, y por eso viven en el override. Documentarlas aca es lo que evita que un futuro lector del schema crea que el modelo esta incompleto.

### 4.1 Obligatoriedad condicional de bloque, y rango de credito (REQ-04)

- **Regla:** `isElective = true` ⇒ campo de bloque no nulo y no vacio. `credits >= 0`.
- **Por que no va al schema:** el bloque es legitimamente `null` para entradas no-electivas. Un `NOT NULL` rompe el caso mayoritario. Es una restriccion de tipo CHECK condicional (`CHECK (NOT isElective OR blockId IS NOT NULL)`), que el ORM tipicamente no modela y que ademas dejaria el mensaje de error fuera del contrato de errores tipados del mod.
- **Nota sobre "no vacio":** si el campo de bloque es un String y no una FK, la validacion incluye trim (un `""` o `"   "` pasa un `NOT NULL` pero viola la regla). **Confirmar la forma del campo en F0**: si es FK, el "no vacio" es redundante; si es String, es esencial.
- **`credits >= 0`:** expresable como CHECK, pero el ticket menciona un guard preexistente `assertCreditRangeOnUpdate` (REQ-08). **Verificar en F0 si ese guard ya cubre el rango en update**; si lo cubre, REQ-04 puede reducirse a extenderlo a `create` en vez de duplicar la validacion. Ver 6.2.
- **Donde vive:** override `createInstance`/`updateInstance` de `PlanEntry`, single y batch.

### 4.2 Convencion de base de `position` (REQ-06)

- **Regla:** `position` en `CurriculumMesh` es **0-based**. No heredar la base de `CompositeSectionTree` (RULE-curriculum-design-041).
- **Por que es un asunto de modelo:** el tipo (`Int`) no distingue base. Dos componentes que comparten el tipo pero no la convencion son una fuente de corrupcion silenciosa: un off-by-one en el renumerado no falla, produce datos mal ordenados. Es exactamente el tipo de bug que el gate de clasificacion de F0 marcaria como **A** (corrompe datos), no C.
- **Accion de datos:** **verificar en F0** si existen mallas con `position` fuera de la convencion 0-based (p.ej. secuencias que arrancan en 1, o con huecos). Query de diagnostico:

```sql
-- Periods cuya secuencia de position no arranca en 0, o tiene huecos/duplicados.
-- Confirmar nombres reales en F0.
SELECT "planId", "period",
       MIN("position")   AS min_pos,
       MAX("position")   AS max_pos,
       COUNT(*)          AS n,
       COUNT(DISTINCT "position") AS n_distinct
FROM "PlanEntry"
GROUP BY "planId", "period"
HAVING MIN("position") <> 0
    OR MAX("position") <> COUNT(*) - 1
    OR COUNT(DISTINCT "position") <> COUNT(*);
```

- Si devuelve filas: **reportar, no corregir sin aprobacion**. Un backfill de normalizacion de `position` es un cambio de datos productivos que excede el alcance declarado del ticket, y ademas cambiaria el orden observable de mallas existentes (violaria REQ-11, no-regresion de comportamiento). La via correcta es: documentar el hallazgo, decidir con el dev si el renumerado de F3 debe tolerar secuencias no canonicas o normalizarlas al pasar.
- **Donde vive la convencion:** documentada en el modelo y aplicada en `movePlanEntry`. No es un CHECK (una secuencia contigua por grupo no es expresable como constraint de fila).

### 4.3 Estado del padre como precondicion de escritura del hijo (REQ-02)

- **Regla:** ningun create/update/delete de `PlanEntry` procede si su `Plan` no esta en `Draft`.
- **Por que es un asunto de modelo:** es una dependencia de escritura **cross-entidad**. El dato que autoriza la mutacion no vive en la fila mutada sino en su padre. Consecuencias concretas:
  1. **Toda** mutacion de `PlanEntry` requiere una lectura previa del `Plan`. En el camino batch, esa lectura debe hacerse **una vez por plan distinto del lote**, no una vez por fila.
  2. En `delete`, el `planId` puede no venir en el input (un delete por `id` de entrada). El guard debe resolver `id → planId → Plan.state`, lo que agrega una lectura. **Confirmar en F1** la forma del input de `deletePlanEntriesBatch` y del delete single.
  3. Si un lote mezcla entradas de planes distintos y solo uno no esta en `Draft`, **el lote completo debe rechazar** (atomicidad de la operacion). Confirmar que el comportamiento del batch es all-or-nothing y no parcial: si hoy es parcial, cambiarlo seria una regresion de comportamiento y hay que consultarlo.
- **Por que no va al schema:** ninguna base de datos relacional expresa "el estado del padre habilita la escritura del hijo" como constraint declarativa (requeriria un trigger, que queda fuera del patron del mod y del contrato de errores tipados).

### 4.4 `progression` con dos paths de escritura (REQ-08) — el punto de modelado real del REQ-08

Este REQ no agrega campos, pero **expone un problema de modelo que hay que dejar escrito**: el mismo dato de negocio (`Plan.progression`) es escribible por dos caminos con guards asimetricos.

| Path | Guard de dominio hoy | Efecto |
|---|---|---|
| Rama `!RT_PATTERN` de `polymorphicUpdate` | Guard de progression presente | Regla se cumple |
| Path `rt__Plan__curriculum` (rama `RT_PATTERN`) | Guard **ausente** | Regla se esquiva |

- **Naturaleza del defecto:** no es un campo faltante, es **cobertura de guard asimetrica entre dos representaciones del mismo objeto** (la base y su proyeccion `rt__`). El riesgo de modelo es que existen mas guards en la rama `!RT_PATTERN` (`assertCreditRangeOnUpdate`, `assertActivityNotInActivePlanOnUpdate`, `assertActivityEvaluationsOnPublish`, `assertNoActiveDependentsOnR...`) y **la misma asimetria puede aplicar a todos**.
- **Consecuencia para el modelo de datos:** al re-cablear los guards para que corran en ambas ramas, **esta PROHIBIDO hacer upsert de la proyeccion `rt` en un update base-only** (RULE-curriculum-design-036). Es decir: el re-cableado no debe crear filas de proyeccion que antes no existian. Eso seria un cambio de datos encubierto — aparecerian registros `rt__Plan__curriculum` para planes que nunca los tuvieron, alterando lo que las lecturas devuelven. **Es el riesgo de datos numero uno de F5.**
- **Verificacion de datos en F5:** antes y despues del cambio, contar filas de la proyeccion `rt__Plan__curriculum`. El conteo debe ser identico. Si crece, hay upsert accidental.
- **Antecedente del guard:** "malla no vacia" = existe al menos un `PlanEntry` con ese `planId`. Es una lectura de existencia (`COUNT(*) > 0` o `findFirst`), soportada por el indice existente en `planId`. No requiere campo denormalizado tipo `entryCount`, y **no se recomienda agregarlo**: seria un dato derivado con riesgo de desincronizacion a cambio de un ahorro marginal.

### 4.5 HTML sanitizado como invariante de contenido (REQ-07)

- **Regla:** el campo HTML de `CustomSection` se sanitiza con whitelist **antes** de persistir, en create y update, por cualquier via.
- **Cambio en el modelo:** el tipo no cambia. Lo que cambia es la **garantia sobre el valor almacenado**: a partir de F4, el contenido en DB es HTML de whitelist. Antes de F4, no habia tal garantia (la sanitizacion ocurria solo al renderizar).
- **Consecuencia critica: los datos historicos no estan cubiertos.** F4 sanitiza escrituras nuevas; las filas escritas antes de F4 pueden contener HTML no sanitizado. Esto significa que **el render sanitizado client-side no es opcional** — REQ-07 ya lo exige ("se mantiene como defensa en profundidad y no se borra"), y aca queda claro **por que** es indispensable y no meramente redundante: es lo unico que protege los datos historicos. Ver la nota de migracion 7.3.
- **Decision de modelado: NO agregar campo de metadata de sanitizacion.** Alternativas evaluadas:

| Opcion | Descripcion | Veredicto |
|---|---|---|
| **A — sin metadata (recomendada)** | El campo guarda HTML sanitizado; nada indica cuando ni con que version | Elegida. No agrega esquema, no agrega estado que mantener. El costo es que no se puede distinguir una fila pre-F4 de una post-F4 sin mirar el contenido |
| B — `sanitizerVersion Int?` | Marca con que version de whitelist se sanitizo | Descartada para este ticket. Utilidad real solo si se planea endurecer la whitelist despues y re-sanitizar selectivamente. Es un campo nuevo, requiere migracion y se sale del alcance declarado ("endurece el backend") |
| C — campo separado `contentSanitized` | Guarda ambos, el original y el sanitizado | Descartada. Duplica almacenamiento y **conserva el payload malicioso en DB**, que es exactamente lo que REQ-07 quiere evitar |

Si el dev quiere trazabilidad de la sanitizacion, la opcion B es viable pero debe declararse como scope adicional.

### 4.6 Insatisfacibilidad de requisitos como precondicion de borrado (REQ-05)

- **Regla:** el borrado (single y batch) rechaza si dejaria requisitos insatisfacibles.
- **Por que no es una FK con `RESTRICT`:** la condicion no es "hay una referencia" sino "el arbol Y/O deja de ser satisfacible". Una rama `O` con dos alternativas tolera perder una; una rama `Y` no tolera perder ninguna. Ninguna semantica de `onDelete` distingue esos casos. Ver 6.1.
- **Restricciones de acceso a datos (de REQ-05, son requisitos, no sugerencias):**
  - Evaluacion **recursiva y fiel** al arbol Y/O; **PROHIBIDO aplanar a lista** (RULE-curriculum-design-033).
  - Reusar `buildRequirementTree`/`assembleRequirementTree` + `evaluateRequirementTree.logic` existentes; no reimplementar.
  - Carga **por lote** sobre el conjunto de requirements del plan afectado. **Sin N+1 por entrada del lote.**
- **Forma del calculo, consecuencia del "por lote":** el guard debe evaluar el estado del arbol **con el lote completo ya removido**, no una entrada a la vez. Borrar A sola puede ser valido y borrar B sola tambien, pero borrar A y B juntas puede romper una rama `Y`. Evaluar entrada por entrada daria un falso verde. **Este es un requisito de correctitud, no de performance**, y conviene tenerlo explicito antes de F2.

---

## 5. Contrato de error de dominio (transversal, REQ-10)

No es persistencia, pero es parte del contrato de datos que las tres vias comparten y por eso se especifica aca.

**Requisito de REQ-10:** las tres vias — (a) UI, (b) `createInstance`/`updateInstance`/`deleteInstance` generico con alias `rt__`, (c) `up1_create/update/delete_object` del MCP — deben rechazar **con el mismo `code` de dominio**.

**Consecuencia de modelado:** hace falta un conjunto **estable y enumerado** de codes, uno por invariante, definido en un solo lugar del mod y reusado por todos los guards. Sin eso, cada via podria emitir un code distinto y la prueba de paridad de REQ-10 no seria verificable.

| Invariante | REQ | Code (propuesta; **confirmar convencion vigente del mod en F0**) | Nota |
|---|---|---|---|
| Plan no esta en `Draft` | REQ-02 | `CD_PLAN_NOT_DRAFT` | — |
| Actividad duplicada en el plan | REQ-03 | `CD_PLAN_ENTRY_DUPLICATE_ACTIVITY` | El **mensaje** ademas debe terminar con el formato Prisma literal (ver 3.1) |
| Electiva sin bloque | REQ-04 | `CD_ELECTIVE_REQUIRES_BLOCK` | — |
| Credito negativo | REQ-04 | `CD_CREDIT_NEGATIVE` | Confirmar si `assertCreditRangeOnUpdate` ya define un code; reusarlo |
| Borrado deja requisitos insatisfacibles | REQ-05 | `CD_DELETE_BREAKS_REQUIREMENTS` | — |
| Cambio de progression con malla no vacia | REQ-08 | reusar el code ya emitido por el guard vigente | **No inventar uno nuevo:** el guard ya existe en la rama `!RT_PATTERN`; extenderlo debe preservar su code, o cambiaria el contrato de la via que hoy si funciona (regresion de REQ-11) |

**Importante — no crear tabla de codes.** Estos son constantes de codigo, no datos. No se persisten.

### 5.1 Costo de lectura introducido por los guards

Los guards agregan lecturas a caminos de escritura que hoy no las hacen. Vale dejarlo dimensionado porque REQ-11 exige que las operaciones legitimas sigan funcionando igual, y una degradacion de performance notoria en el batch **es** una regresion de comportamiento observable.

| Guard | Lectura que agrega | Forma correcta en batch | Indice que la soporta |
|---|---|---|---|
| Estado del plan (REQ-02) | `Plan.state` del padre | 1 lectura por **plan distinto** del lote (no por fila) | PK de `Plan` |
| Unicidad (REQ-03, via B) | entradas existentes por `(planId, activityId)` | 1 lectura por plan trayendo los `activityId` del plan, mas deteccion de duplicados **dentro del propio lote** | `@@index([planId, activityId])` (3.1) |
| Forma (REQ-04) | ninguna (validacion de la propia fila) | — | — |
| Borrado seguro (REQ-05) | requirements del plan + arbol | 1 carga por plan, evaluada con el lote completo removido | indices de `Requirement` (confirmar en F2) |
| Move (REQ-06) | entradas de period origen + destino | dentro de la transaccion | `@@index([planId, period, position])` (3.2) |
| Progression (REQ-08) | existencia de `PlanEntry` del plan | `findFirst` / `exists`, no `count` completo | indice por `planId` |

**Nota sobre unicidad en batch (via B):** el guard debe detectar duplicados **contra la DB y dentro del propio lote**. Un lote que inserta dos veces la misma `activityId` pasa un check que solo consulta la DB. Facil de omitir; es exactamente el hueco que la prueba unitaria de REQ-03 debe cubrir.

---

## 6. Alternativas de modelado evaluadas y descartadas

### 6.1 `onDelete: RESTRICT` para el borrado seguro (REQ-05)

**Descartada.** La condicion de rechazo es la insatisfacibilidad del arbol Y/O, no la existencia de una referencia. Una rama `O` con dos alternativas debe **permitir** borrar una de ellas; `RESTRICT` la bloquearia, rompiendo un flujo hoy legitimo (regresion de REQ-11). Ademas no produciria el error tipado que REQ-10 exige en paridad por las tres vias.

### 6.2 Nuevos guards vs extension de guards existentes (REQ-04, REQ-08)

**A verificar antes de implementar, no una decision cerrada.** El ticket nombra guards vigentes: `assertCreditRangeOnUpdate`, `assertActivityNotInActivePlanOnUpdate`, `assertActivityEvaluationsOnPublish`, `assertNoActiveDependentsOnR...`, `polymorphicUpdate`, `sectionValidation`, `assertActivityNotInActivePlan`.

En F0/F1 hay que leer cada uno y responder:
1. `assertCreditRangeOnUpdate` — ¿ya cubre `credits >= 0`? Si si, REQ-04 se reduce a extenderlo a `create`, no a escribir un guard nuevo. Duplicar la validacion con otro code romperia la paridad de REQ-10.
2. ¿Cual de estos guards sufre la **misma** asimetria `RT_PATTERN` que motiva REQ-08? El REQ pide re-cablear la rama sin romper los demas; saber cuales estaban efectivamente activos en cada rama es prerequisito para verificar que no se rompio ninguno.

**Consecuencia para el modelo:** ninguna estructura nueva; pero la respuesta determina si el conjunto de codes de la seccion 5 crece o reusa los existentes.

### 6.3 Campo denormalizado `Plan.entryCount`

**Descartada.** Ahorraria la lectura de existencia de REQ-08 a cambio de un contador que hay que mantener sincronizado en cada create/delete de `PlanEntry` — incluyendo los paths genericos y MCP que este ticket justamente esta tratando de cubrir. Un contador desincronizado convertiria un guard de seguridad en un guard que aprueba lo que deberia rechazar. El costo que evita es un `findFirst` indexado. Mala relacion.

### 6.4 Trigger de DB para el estado del padre (REQ-02)

**Descartada.** Un trigger cumpliria el invariante incluso ante escritura directa a DB, pero: (1) queda fuera del patron de overrides del mod, (2) no produce el error tipado con `code` que REQ-10 exige, (3) es invisible para el dev que lee el resolver, y (4) el ticket es explicitamente camino A puro ("resolvers del mod"). Si en algun momento se quiere blindar contra escritura directa a DB, es una conversacion aparte.

---

## 7. Notas de migracion

### 7.1 Orden respecto de las fases

| Fase | Cambio de datos | Reversibilidad |
|---|---|---|
| F0 | **Ninguno.** Solo diagnostico: correr las queries de 3.1 y 4.2 contra datos reales de UPU, refrescar watermark, materializar submodulo, capturar baseline | N/A |
| F1 | Migracion de `@@unique([planId, activityId])` **solo si** el diagnostico dio cero duplicados. Si dio duplicados: sin migracion, guard aplicativo + `@@index` de soporte | Constraint: `DROP` del indice. Guard: revertir commit |
| F2 | **Ninguno.** Solo lectura del arbol de requisitos | Revertir commit |
| F3 | **Ninguno de esquema.** Posible `@@index([planId, period, position])` si no existe | `DROP` del indice |
| F4 | **Ninguno de esquema.** Datos historicos quedan sin sanitizar por diseño (ver 7.3) | Revertir commit; los datos ya sanitizados no se des-sanitizan (perdida de fidelidad del original, aceptada) |
| F5 | **Ninguno.** Riesgo: upsert accidental de la proyeccion `rt__Plan__curriculum` (ver 4.4). Verificar conteo antes/despues | Revertir commit. **Si hubo upsert accidental, revertir el codigo no borra las filas creadas** — habria que limpiarlas a mano |
| F6 | **Ninguno.** Cierre documental | N/A |

### 7.2 Migracion de unicidad (F1) — checklist

1. Correr la query de duplicados de 3.1 contra **datos reales de UPU**, no contra la DB de test. El ticket lo exige explicitamente.
2. Confirmar la semantica de `activityId` nullable (3.1). Define si la unicidad cubre el caso NULL.
3. Confirmar si existe un unique previo en `(planId, period, position)` y **no eliminarlo** (3.2).
4. Registrar la decision (via A o via B) con el conteo de duplicados que la respalda. REQ-03 lo pide.
5. Confirmar el nombre de campo que el friendly-error espera dentro de los backticks del mensaje Prisma (3.1).
6. Si es via A: correr la migracion primero sobre una **copia** del store, no sobre el vivo.

### 7.3 Datos historicos de `CustomSection` (F4)

F4 protege las escrituras futuras. Las filas anteriores pueden contener HTML no sanitizado. **Un backfill de sanitizacion esta fuera del alcance declarado de este ticket** y no debe correrse sin aprobacion explicita, porque:

- Es una mutacion masiva e **irreversible** de contenido productivo (el HTML original se pierde).
- Podria alterar la presentacion de secciones existentes, violando REQ-11 (no-regresion de comportamiento observable).

**Recomendacion:** dejar el backfill fuera, documentar que el render sanitizado client-side es lo que cubre los datos historicos (por eso REQ-07 lo conserva, y por eso no es opcional), y evaluar el backfill como ticket propio si se quiere cerrar el hueco en DB. Query de diagnostico util para dimensionarlo, sin mutar nada:

```sql
-- Dimensionar cuantas CustomSection contienen tags fuera de whitelist.
-- Heuristica de diagnostico, NO un sanitizador. Ajustar la lista al whitelist real de F4.
SELECT COUNT(*) AS con_tags_sospechosos
FROM "CustomSection"
WHERE "content" ~* '<(script|iframe|object|embed|form|link|style|svg|on[a-z]+=)';
```

### 7.4 Sin datos de Kanai involucrados

Ninguno de los cambios de este documento toca el store de Kanai (`~/.kanai/data/<repo-slug>/kanai.db`). El modelo afectado es el del proyecto up1 / `mods/curriculum-design` y, en lo que respecta a `RecordType`, el de `object-manager` — que este ticket **explicitamente deja fuera** (Core Extensions, se coordina con core).

---

## 8. Fuera del modelo de datos de este ticket

| Elemento | Motivo |
|---|---|
| `requiresComment` (enforcement) | Core Extension en `object-manager`; se coordina con core |
| Enum `RecordType` (enforcement) | Core Extension en `object-manager`; se coordina con core |
| `blockGenericMutation` / fichas / `registerExtra` del repo `mcp` | Camino B. Con el invariante en el override el objeto queda en N0 ⇒ innecesario para cd. Entra solo si F0 encuentra una regla que no admite override, coordinado con UPONE-1758 |
| Fichas MCP nuevas para la malla | El ticket endurece el backend, no agrega superficie MCP |
| Camino C (`deriveLevel`, `recalcPeriodPosition` como comodidad, `guidedAdd`, `editEntryModal`, `blockSelect`) | UX/presentacion. Pasan por el gate de F0; solo ganan A si saltarlos corrompe datos. **Si alguno reclasifica a A en F0, este documento debe actualizarse** |
| Backfill de normalizacion de `position` | Mutacion de datos productivos con impacto en orden observable; fuera de alcance, reportar hallazgo (4.2) |
| Backfill de sanitizacion de `CustomSection` | Irreversible y con impacto en presentacion; fuera de alcance (7.3) |
| Remediacion de duplicados `(planId, activityId)` preexistentes | Si existen, la via es el guard aplicativo, no borrar/fusionar datos. La remediacion seria ticket propio |

---

## 9. Checklist de confirmacion en F0

Todo `A CONFIRMAR` de este documento, consolidado. Ninguna migracion debe escribirse antes de cerrar esta lista.

**Nombres y formas de campo**
- [ ] Nombre real y nulabilidad de `activityId` en `PlanEntry`
- [ ] Nombre real del flag de electiva y su default
- [ ] Nombre y **forma** del campo de bloque: ¿FK o String? (define si "no vacio" requiere trim — 4.1)
- [ ] Nombre y tipo de `credits` (Int o Decimal)
- [ ] Nombre real del campo de estado de `Plan` y los valores exactos de su enum (¿`Draft` literal?)
- [ ] Tipo de `Plan.progression` (enum o String)
- [ ] Nombre del campo HTML de `CustomSection`
- [ ] Forma de la relacion `Requirement` → `Activity` / `PlanEntry` (4.5, define el efecto del borrado)

**Indices y constraints vigentes**
- [ ] Indices actuales de `PlanEntry` (¿existe ya `(planId, period, position)`? ¿existe un unique ahi?)
- [ ] Indices de `Requirement` que soportan la carga por lote sin N+1

**Diagnostico de datos (contra UPU real)**
- [ ] Conteo de duplicados `(planId, activityId)` — decide via A vs via B de REQ-03
- [ ] Periods con `position` fuera de la convencion 0-based — 4.2
- [ ] Conteo de filas `rt__Plan__curriculum` (baseline para verificar que F5 no hace upsert) — 4.4
- [ ] Dimensionamiento de `CustomSection` con tags fuera de whitelist — 7.3

**Contratos existentes**
- [ ] Nombre de campo que el friendly-error espera en el mensaje Prisma (RULE-curriculum-design-005)
- [ ] Convencion de `code` de error vigente del mod (¿prefijo `CD_`?)
- [ ] ¿`assertCreditRangeOnUpdate` ya cubre `credits >= 0`? (define si REQ-04 escribe guard nuevo o extiende — 6.2)
- [ ] Code que emite hoy el guard de progression (reusarlo, no inventar — seccion 5)
- [ ] Forma del input de `deletePlanEntriesBatch` y del delete single (¿trae `planId` o solo `id`? — 4.3)
- [ ] ¿El batch es all-or-nothing o parcial hoy? (define el comportamiento correcto del rechazo — 4.3)

**Gate de clasificacion A vs C**
- [ ] `deriveLevel`, `recalcPeriodPosition`, `guidedAdd`, `editEntryModal`, `blockSelect` — criterio: corrompe datos ⇒ A; solo degrada UX ⇒ C. Si alguno da A, actualizar este documento