# TICKET-149 · Modelo de datos afectado

> **Alcance del documento:** describe el modelo de datos que toca TICKET-149 (tributación: guardado en conjunto, peso del eje 1, vía masiva, vista por malla). **No se crean entidades ni columnas nuevas en este ticket.** Lo único persistido que cambia de estado es `CompetencyAlignment.contributionPercentage`, que ya existe en `develop` por UPONE-1769 y aquí pasa de "columna cableada" a "campo escribible y validado por la vía gobernada".
>
> **Convención de marcas:** `[EXISTENTE]` ya en `develop`; `[EXISTENTE · CAMBIA USO]` la estructura no cambia, cambia quién la escribe o cómo se valida; `[NUEVO]` se crea en este ticket; `[NO SE CREA]` se declara explícitamente para cerrar la puerta a modelar de más.
>
> **Verificación pendiente:** los puntos marcados con `⚠ verificar en código` son inferencias del contrato del ticket que deben contrastarse contra el modelo real del mod (`curriculum-mapping`) antes de codear. Ninguno cambia la forma del modelo, solo el nombre exacto del tipo o de la relación.

---

## 1. Resumen ejecutivo del impacto

| Dimensión | Impacto |
|---|---|
| Entidades nuevas | **Ninguna** |
| Columnas nuevas | **Ninguna** (`contributionPercentage` ya existe, UPONE-1769) |
| Columnas que cambian de tipo o nulabilidad | **Ninguna** |
| Índices nuevos | **Ninguno** (el índice de grupo ya existe, UPONE-1769) |
| Enums nuevos o valores nuevos en enums | **Ninguno** |
| Migración de datos (backfill / DDL) | **Ninguna** |
| Cambio real | Superficie de escritura (`WRITABLE_FIELDS`), validación por fila, semántica de scope del batch, y objetos de **transporte** (no persistidos) |

La consecuencia de modelo más importante del ticket **no es una columna**: es que `CompetencyAlignment` **no tiene `matrixId`**, y por lo tanto el scope del reemplazo transaccional debe derivarse por navegación (`planId` + pertenencia de `competencyNodeId` a la matriz), no por filtro directo. Eso está en §4.

---

## 2. Entidad central: `CompetencyAlignment` `[EXISTENTE · CAMBIA USO]`

La tributación: la fila que dice "esta asignatura del plan tributa a esta competencia, en este nivel de desarrollo, con este tipo de contribución, con este peso".

### 2.1 Campos

| Campo | Tipo | Obligatorio | FK / Enum | Default | Estado | Notas |
|---|---|---|---|---|---|---|
| `id` | ID | Sí | PK | generado | `[EXISTENTE]` | |
| `planId` | ID | Sí | FK → `Plan` ⚠ verificar nombre del tipo | ninguno | `[EXISTENTE · CAMBIA USO]` | **Derivado server-side** en el batch (REQ-01). El cliente **no** lo envía como fuente de verdad por fila; se toma del scope `(planId, matriz)` de la mutación. Eje 1 de la clave de grupo. |
| `competencyNodeId` | ID | Sí | FK → `CompetencyNode` | ninguno | `[EXISTENTE · CAMBIA USO]` | Es lo que ancla la fila a **una matriz**, indirectamente. Eje 2 de la clave de grupo y eje del scope de borrado (§4). |
| `planEntryId` | ID | Sí ⚠ verificar | FK → `PlanEntry` | ninguno | `[EXISTENTE]` | La asignatura **dentro del plan** (no `Subject` suelto). Es el que aporta `period` y `position` para la vista por malla (REQ-08). ⚠ verificar si el modelo guarda `planEntryId` o `subjectId` + resolución; el resolver de vista ya trae `planEntry`, lo que sugiere `planEntryId`. |
| `developmentLevelId` | ID | Sí | FK → `DevelopmentLevel` ⚠ verificar si es entidad o enum | ninguno | `[EXISTENTE · CAMBIA USO]` | Introduce / Reinforce / Master. El editor lo restringe a **los niveles que la competencia declara** (REQ-09b): el dominio de valores válidos por fila **no** es el enum completo, es el subconjunto declarado por el `CompetencyNode`. Eje 3 de la clave de grupo. |
| `contributionType` | Enum | Sí | `Develops` \| `Evaluates` \| `Both` | ninguno | `[EXISTENTE · CAMBIA USO]` | **R-6**: gobierna si la fila admite peso. Ver §2.3. |
| `contributionPercentage` | String decimal (0.00–100.00, 2 decimales) ⚠ verificar tipo de columna | **No (nullable)** | ninguno | `null` | `[EXISTENTE · CAMBIA USO]` | **El campo del ticket.** Cableado en UPONE-1769, escribible desde aquí. Transportado como **string** y persistido **sin truncar** (REQ-03). `null` es un valor de negocio legítimo, no "sin migrar": significa "esta fila no pesa" (Develops) o "todavía no se le asignó peso". |
| marca "fuera de diseño" (R-12) | Boolean o derivado ⚠ verificar | ⚠ verificar | ninguno | ⚠ verificar | `[EXISTENTE · CAMBIA USO]` | **Crítico para el scope de borrado.** R-12 dice que estas filas **se marcan, no se borran**, y el batch **nunca las retira** (REQ-02). Verificar si es una columna persistida o una condición derivada (p. ej. la asignatura ya no pertenece al plan / la competencia ya no está en la matriz adoptada). **Este ticket no la crea ni la cambia**: solo debe respetarla como exclusión del reemplazo. |
| campos de auditoría | (según base del mod) | Sí | ninguno | automáticos | `[EXISTENTE]` | El batch escribe **una sola entrada de historial** para toda la transacción (REQ-01), no una por fila. |

### 2.2 Clave de grupo del peso `[EXISTENTE · CAMBIA USO]`

```
grupo := (planId, competencyNodeId, developmentLevelId)
```

Es la unidad sobre la que:
- se calcula el reparto en partes iguales (REQ-05),
- se deriva el estado automático/manual (REQ-06),
- debe sumar 100 al publicar el plan (**D1, fuera de alcance**, ver §8).

No es una entidad, no es una tabla, no es un objeto: es una **clave compuesta de agrupamiento en runtime**, sostenida por el índice de §3.

### 2.3 Regla de nulabilidad condicional (R-6) `[EXISTENTE · CAMBIA USO]`

`contributionPercentage` es nullable a nivel de columna, pero su nulabilidad **real depende de `contributionType`**:

| `contributionType` | `contributionPercentage` permitido | Regla |
|---|---|---|
| `Develops` | **Solo `null`** | R-6: desarrolla pero no mide, no pesa. Un peso en una fila `Develops` es un error de validación, no un dato que se ignora. |
| `Evaluates` | `null` o `[0,100]` con ≤2 decimales | Pesa. `null` = aún sin asignar. |
| `Both` | `null` o `[0,100]` con ≤2 decimales | Pesa. |

Esta regla **no se puede expresar como constraint de columna** en el modelo actual (es un CHECK cruzado entre dos columnas). Se implementa en la validación por fila del batch (`validateCompetencyAlignment.js`), dentro de la transacción.

> **Consecuencia de diseño a tener presente:** un cambio de tipo de `Evaluates`/`Both` a `Develops` **debe limpiar el peso a `null` en la misma transacción**. Si no, queda una fila que viola R-6 sin que nadie la vuelva a tocar. Esto es modelo, no UI: la vía gobernada tiene que garantizarlo aunque el peso lo haya seteado otra pantalla.

### 2.4 Precisión del peso (REQ-03) `[EXISTENTE · REUSO]`

Se **reusa** el criterio de precisión ya vigente en el módulo (`isValidWeight` / `hasWeightPrecision`), **no se duplica**. Formato canónico:

- rango `[0, 100]` inclusive en ambos extremos,
- máximo 2 decimales,
- transporte **string** (evita el redondeo binario de float en el borde `0.1 + 0.2`),
- persistencia sin truncar: lo que entró es lo que queda.

`cm.displayDecimals` (único parámetro de tenant del mod) es de **presentación**, no de validación ni de persistencia. No entra al modelo de datos.

---

## 3. Índices

| Índice | Campos | Estado | Para qué |
|---|---|---|---|
| Índice de grupo del peso | `(planId, competencyNodeId, developmentLevelId)` | `[EXISTENTE]` (UPONE-1769, ya en `develop`) | Agrupar las filas que pesan para el reparto y para la derivación auto/manual; y, a futuro, para el guard de suma 100 (D1). |
| PK | `id` | `[EXISTENTE]` | |
| FK índices (`planId`, `competencyNodeId`, `planEntryId`, `developmentLevelId`) | según base del mod ⚠ verificar | `[EXISTENTE]` | El batch los usa para resolver el scope de retiro (§4). |
| Índices nuevos | — | `[NO SE CREA]` | El ticket no agrega índices. |

> **Nota de rendimiento, no de modelo:** el scope de retiro (§4) resuelve "competencias de la matriz" por navegación. Si el plan tiene muchas matrices adoptadas y la matriz muchas competencias, conviene resolver el conjunto de `competencyNodeId` **una vez por transacción** y filtrar por `IN`, en vez de por fila. No requiere índice nuevo; el índice de grupo y el de `competencyNodeId` cubren el acceso.

---

## 4. Scope del batch: cómo se acota `(planId, matriz)` sin columna `matrixId`

Este es el punto de modelo más delicado del ticket y la razón de REQ-02.

### 4.1 El hecho

`CompetencyAlignment` **no tiene columna `matrixId`** (confirmado en código; el `competencyAlignmentView` ya filtra así, línea 293). La pertenencia a una matriz es **indirecta**, vía la competencia:

```
CompetencyAlignment.competencyNodeId
        └─→ CompetencyNode
                └─→ (pertenencia) CompetencyMatrix   ⚠ verificar nombre de la relación
```

### 4.2 El scope efectivo del reemplazo

```
filas_en_scope := CompetencyAlignment
                  WHERE planId = <planId derivado server-side>
                    AND competencyNodeId IN (competencias de <matrizId enviada>)
                    AND NOT <marca fuera de diseño (R-12)>
```

Y dentro de ese scope, y **solo** dentro de ese scope:

```
a_retirar := filas_en_scope  MENOS  filas_enviadas_en_el_payload
```

### 4.3 Lo que el batch NUNCA toca

| Conjunto | Por qué queda afuera |
|---|---|
| Tributaciones de **otras matrices adoptadas por el mismo plan** | Comparten `planId` pero sus `competencyNodeId` no pertenecen a la matriz enviada. Si el filtro se hiciera solo por `planId`, el batch borraría el trabajo de otra matriz. **Este es el modo de falla a evitar.** |
| Tributaciones del **mismo plan+matriz marcadas "fuera de diseño"** (R-12) | Se marcan, no se borran. Son residuo intencional, no ausencia. |
| Tributaciones de **otros planes** | Distinto `planId`. |

### 4.4 Por qué "lo que no vino = retirar" es seguro

Porque el contrato de guardado (confirmado) dice que el cliente **reenvía el conjunto completo** del `(planId, matriz)` cargado, y **el view no pagina**. Si el view paginara en el futuro, esta semántica se rompe en silencio: el batch interpretaría "página 2 no vino" como "retirar página 2".

> **Invariante a dejar escrita en el resolver, no solo en el spec:** el payload del batch es el conjunto completo del scope, no un delta. Cualquier paginación futura de `alignmentView` obliga a revisar esta mutación.

---

## 5. Entidades relacionadas: se leen, no cambian

Todas `[EXISTENTE]`, **sin cambios de estructura**. Se listan porque el batch y las dos vistas dependen de ellas.

| Entidad | Rol en este ticket | Campos relevantes | Cambia |
|---|---|---|---|
| `Plan` ⚠ verificar nombre | Dueño del scope. `planId` se deriva de acá server-side (REQ-01). | `id` | No |
| `PlanEntry` | La asignatura dentro del plan. **Fuente de la vista por malla** (REQ-08). | `period` (agrupador de las cards), `position` (orden dentro del período), código y nombre de asignatura | No |
| `CompetencyNode` | La competencia. Ancla la fila a la matriz (§4) y **declara qué niveles de desarrollo admite** (acota el segmentado de REQ-09b). | `id`, niveles declarados ⚠ verificar forma | No |
| `CompetencyMatrix` ⚠ verificar nombre | Eje 2 del scope del batch. Solo se usa para resolver el conjunto de `competencyNodeId`. | `id` | No |
| `DevelopmentLevel` ⚠ verificar si entidad o enum | Introduce / Reinforce / Master. Eje 3 del grupo del peso. | `id`, nombre | No |
| `Subject` | Datos de presentación de la asignatura. | código, nombre | No |
| `CurriculumMesh` (curriculum-design) | **No se importa** (M-26). La "vista por malla" es un **modo de vista de la propia tributación**, dibujado con datos de `PlanEntry`, no el objeto malla de otro mod. | — | **No se toca, no se importa, no se referencia** |

> **Aclaración que conviene no perder:** "Por malla" es un nombre de **layout**, no un vínculo de datos con `CurriculumMesh`. Nada del modelo de este ticket cruza a curriculum-design.

---

## 6. Objetos de transporte (no persistidos) `[NUEVO]`

Son contratos de entrada/salida de las mutaciones. **No son entidades, no tienen tabla, no tienen id, no se guardan.** Se documentan acá porque definen la superficie de escritura.

### 6.1 Entrada del upsert de conjunto (REQ-01, REQ-11)

```
CompetencyAlignmentBatchInput
  planId        : ID    (obligatorio; se usa para derivar y validar el scope server-side)
  matrixId      : ID    (obligatorio; define el conjunto de competencyNodeId del scope)
  rows          : [CompetencyAlignmentRowInput]   (conjunto COMPLETO del scope, no delta)

CompetencyAlignmentRowInput
  id                      : ID      (opcional; presente = fila existente, ausente = alta)
  competencyNodeId        : ID      (obligatorio)
  planEntryId             : ID      (obligatorio)
  developmentLevelId      : ID      (obligatorio)
  contributionType        : Enum Develops|Evaluates|Both   (obligatorio)
  contributionPercentage  : String  (opcional / nullable; null obligatorio si type = Develops, R-6)
```

**No lleva `planId` por fila:** se deriva server-side del scope (REQ-01). Aceptarlo por fila abriría la puerta a escribir en otro plan dentro de una transacción autorizada para este.

### 6.2 Entrada y salida de la vía masiva (REQ-07)

```
BulkAlignmentInput
  planId              : ID
  matrixId            : ID
  competencyNodeId    : ID     (la competencia en mano)
  developmentLevelId  : ID     (el destino: nivel)
  contributionType    : Enum   (el destino: tipo)
  planEntryIds        : [ID]   (las varias asignaturas)

BulkAlignmentResult
  applied : [ { planEntryId } ]
  skipped : [ { planEntryId, reason } ]

reason ∈ { DUPLICATE_EXISTING, OUT_OF_MATRIX, RULE_VIOLATION }   ⚠ nombres a fijar con backend
         (duplicado existente | fuera de la matriz | regla R-1..R-5/R-10 no cumplida)
```

Una sola transacción, con el trabajo **troceado en el backend** (AD-12, patrón `matrixAdoption.resolver.js:246-300`). El troceo es de ejecución; **no** parte la atomicidad ni genera varias entradas de historial.

### 6.3 Derivación client-side (REQ-05, REQ-06) `[NUEVO · PURO, NO PERSISTIDO]`

En `weights.ts`, helper puro, sin estado y sin ida al servidor:

```
repartirEnPartesIguales(filasQuePesan) -> pesos
  · reparte 100 entre las filas Evaluates|Both del grupo
  · respeta el límite de 2 decimales
  · ajusta el residuo para que la suma dé exactamente 100

estadoDelGrupo(pesosActuales) -> 'automatico' | 'manual'
  · 'automatico' cuando los pesos actuales coinciden con el reparto en partes iguales
  · 'manual' en cualquier otro caso
```

---

## 7. Lo que explícitamente NO se modela `[NO SE CREA]`

Esta sección existe para cerrar la puerta: son las cosas que un modelador razonable agregaría y que **este ticket prohíbe**.

| Tentación | Por qué NO | REQ |
|---|---|---|
| Columna / campo `distributionMode`, `isAutoDistributed`, `weightMode` | El estado automático/manual **se deriva** de los pesos actuales. Persistirlo crea un segundo origen de verdad que se desincroniza en cuanto alguien edita un peso por otra vía. | REQ-06 |
| Entidad `AlignmentWeightGroup` (o similar) que reifique el grupo | El grupo es una clave compuesta con un índice, no un objeto. Reificarlo obliga a mantener ciclo de vida (crear/borrar grupos) sin ganancia. | REQ-06 |
| Columna `matrixId` en `CompetencyAlignment` | Sería una desnormalización con dos fuentes de verdad sobre la pertenencia a matriz. El scope se resuelve por navegación (§4). Si en algún momento se quiere por performance, es un ticket propio con su migración y su backfill. | REQ-02 |
| Campo que guarde la suma del grupo | Derivable. Y el guard de suma 100 es de otro ticket (D1). | — |
| Enum nuevo o valor nuevo en `contributionType` / niveles | Los tres valores de cada uno ya existen. | REQ-04, REQ-09 |
| Objeto/columna para "fuera de diseño" nuevo | R-12 ya está resuelto; este ticket solo lo **respeta** como exclusión. | REQ-02 |

---

## 8. Fuera de alcance con impacto de modelo conocido

| Tema | Qué toca del modelo | Dónde vive |
|---|---|---|
| **D1: guard "suma 100 al publicar el plan"** | **Ningún campo nuevo.** Es una validación cross-mod (curriculum-design) que **lee** el grupo `(planId, competencyNodeId, developmentLevelId)` y suma `contributionPercentage`. El índice de grupo de §3 ya la soporta. | Ticket aparte: `Pendiente cross-mod - Guard de suma al publicar el plan (D1, derivado de 1770)` |
| Indicadores y versionado del plan | UPONE-1771 | |
| `outcomeAlignment` y retiro con aviso | UPONE-1772 | |
| Migración de niveles de desarrollo | UPONE-1773. **Si esa migración cambia identidad de `developmentLevelId`, toca el eje 3 del grupo del peso.** Dependencia a vigilar. | |
| R-9 (gate del peso por institución) | Legacy, no aplica en up1: el único parámetro de tenant del mod es `cm.displayDecimals`, que es de presentación. **No entra al modelo.** | |

---

## 9. Notas de migración

### 9.1 DDL

**Ninguna en este ticket.** La columna `contributionPercentage` (nullable) y el índice de grupo llegaron con **UPONE-1769**, ya mergeado a `develop`. TICKET-149 **asume** ese estado y no lo repite.

> **Precondición de arranque:** confirmar que la rama de trabajo tiene 1769 integrado. Si se codea sobre una base sin 1769, la validación y el `WRITABLE_FIELDS` compilan pero fallan en runtime contra una columna que no existe.

### 9.2 Backfill

**Ninguno.** Las filas existentes quedan con `contributionPercentage = null`, que es un estado válido y esperado ("aún sin peso asignado"). No hay que inventar un 0, y menos un reparto: un 0 significa "pesa cero", que es una afirmación de negocio distinta de "todavía no lo definieron".

### 9.3 Higiene de datos a verificar (no destructiva)

Antes de dar por cerrado el ticket, conviene **contar** (no corregir automáticamente) filas que violen R-6:

```
SELECT count(*) FROM CompetencyAlignment
WHERE contributionType = 'Develops' AND contributionPercentage IS NOT NULL;
```

Esperado: **0** (la columna es nueva y nadie escribió pesos aún por vía gobernada). Si da distinto de 0, hay una vía de escritura que no pasa por la validación (candidato: el CRUD generic del MCP, justamente el hueco que documenta REQ-12). **Reportar, no limpiar sin aprobación.**

### 9.4 Superficie de escritura

| Vía | Antes | Después | Nota |
|---|---|---|---|
| `WRITABLE_FIELDS` en `validateCompetencyAlignment.js` | sin `contributionPercentage` | **con** `contributionPercentage` | El cambio de superficie del ticket |
| Batch gobernado `*Validated` + `runInTransaction` | — | única vía legítima de escritura de conjunto | RBAC propio: exige **create + modify + delete**, no delega en el generic |
| CRUD generic / MCP | permite el campo | **sigue permitiéndolo** | Hueco **conocido y documentado** por el test de paridad (REQ-12). El cierre real (patrón `blockGenericMutation`) es de los tickets de MCP de cm, no de este. |

### 9.5 Post-merge

- `sync` / `codegen` **sin drift**; artefactos de sync **no commiteados**.
- El CRUD fila por fila de UPONE-1756 debe seguir verde: el batch **se suma**, no reemplaza esa vía en este ticket.

---

## 10. Relaciones (vista de conjunto)

```
Plan (1) ──────────────< (N) PlanEntry
  │                              │  period, position  ──→ alimenta la vista "Por malla" (REQ-08)
  │                              │
  │                              │ (1)
  │                              ∨ (N)
  └──────────────< (N) CompetencyAlignment (N) >──────── (1) DevelopmentLevel
       planId                    │                            eje 3 del grupo
                                 │ contributionType : Develops | Evaluates | Both
                                 │ contributionPercentage : string(0-100, 2dec) | null   ← R-6
                                 │
                                 │ (N)
                                 ∨ (1)
                           CompetencyNode ──(pertenencia)──> CompetencyMatrix
                                 eje 2 del grupo               NO hay FK directa
                                                               desde CompetencyAlignment
                                                               (por eso §4)

grupo del peso = (planId, competencyNodeId, developmentLevelId)   ← índice existente (1769)
scope del batch = planId AND competencyNodeId ∈ competencias(matrizId) AND NOT fuera-de-diseño
```

---

## 11. Trazabilidad REQ → modelo

| REQ | Qué exige del modelo | Elemento |
|---|---|---|
| REQ-01 | `planId` derivado server-side; una sola entrada de historial | §2.1, §6.1 |
| REQ-02 | Scope de retiro sin `matrixId`; excluir otras matrices y R-12 | §4 |
| REQ-03 | `contributionPercentage` escribible y validado, string, sin truncar, precisión reusada | §2.1, §2.4, §9.4 |
| REQ-04 | R-6 (solo Evaluates/Both pesan) + clave de grupo | §2.2, §2.3 |
| REQ-05 | Reparto client-side sobre el grupo | §6.3 |
| REQ-06 | Estado auto/manual **derivado**, sin campo nuevo | §6.3, §7 |
| REQ-07 | Contrato de entrada/salida de la vía masiva con motivos de salteo | §6.2 |
| REQ-08 | `period` / `position` de `PlanEntry`; sin `CurriculumMesh` | §5 |
| REQ-11 | Ambas vistas producen el **mismo** payload de batch | §6.1 |
| REQ-12 | Hueco del generic documentado, no cerrado acá | §9.4 |
| D1 (fuera) | El índice de grupo ya soporta la suma futura | §3, §8 |