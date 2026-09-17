# Modelo de datos afectado, TICKET-143 (Curriculum Mapping / Tributación / CRUD por competencia)

Alcance del documento: entidades tocadas, campos, índices, relaciones y notas de migración para el CRUD gobernado de `CompetencyAlignment`. Todo vive en el mod `curriculum-mapping` (REQ-18), sin Core Extension ni cambios en core.

Convención de marcas:

| Marca | Significado |
|---|---|
| NUEVO | se crea en este ticket |
| MODIFICADO | entidad existente que cambia en este ticket |
| EXISTENTE | se consume tal cual, sin cambios |
| FUERA DE ALCANCE | campo o entidad que aparece en el modelo pero que este ticket no toca |

---

## 1. Mapa de entidades

```
Plan (EXISTENTE)
 |
 |-- 1:N --> PlanEntry (EXISTENTE)
 |                |
 |                |-- 1:N --> CompetencyAlignment (MODIFICADO)
 |                                   |
 |-- 1:N --> MatrixAdoption (EXISTENTE)          |
 |                |                              |
 |                +--> CompetencyMatrix (EXISTENTE)
 |                             |                 |
 |                             |-- 1:N --> CompetencyNode (EXISTENTE)
 |                                              |    ^ parentId (auto-referencia, deriva "sin hijos")
 |                                              |
 |                                              |-- 1:N --> CompetencyNodeDevelopmentLevel (EXISTENTE)
 |                                                                    ^
 CompetencyAlignment.planId (NUEVO, denormalizado) --------------------+
                          .developmentLevel referencia un nivel declarado por su competencia
```

Cardinalidades relevantes:

- `Plan` 1:N `PlanEntry`. El panel lateral "Asignaturas del plan" (REQ-13) lee esta relación, mismo origen que la malla.
- `PlanEntry` 1:N `CompetencyAlignment`. Una asignatura puede tributar a varias competencias.
- `CompetencyNode` 1:N `CompetencyAlignment`. Una competencia recibe tributación de varias asignaturas.
- El par (`planEntryId`, `competencyNodeId`) es único (R-2, REQ-04). Esto convierte la relación PlanEntry a CompetencyNode en un N:M con tabla intermedia de un solo registro por par, y es lo que hace que un "mover" sea un update y nunca un insert (R-10, REQ-08).
- `CompetencyNode` 1:N `CompetencyNodeDevelopmentLevel`. Define las columnas de la grilla por fila de competencia (REQ-14) y el dominio válido de `developmentLevel` (R-4, REQ-06).
- `Plan` N:M `CompetencyMatrix` vía `MatrixAdoption`. Es el habilitante de R-1 (REQ-03).

---

## 2. CompetencyAlignment (MODIFICADO)

Objeto central del ticket. Es la tabla de unión del mod entre asignatura del plan y competencia. Todas las mutaciones pasan por el resolver gobernado (mutaciones `Validated`), única vía de escritura para UI, API y el MCP de up1 (REQ-10).

### 2.1 Campos

| Campo | Tipo | Obligatorio | FK / Enum | Default | Marca | Notas |
|---|---|---|---|---|---|---|
| `id` | Id | sí | PK | generado | EXISTENTE | |
| `planEntryId` | Id | sí | FK a `PlanEntry.id` | ninguno | EXISTENTE | Asignatura del plan que tributa. Parte de la clave única de R-2. |
| `competencyNodeId` | Id | sí | FK a `CompetencyNode.id` | ninguno | EXISTENTE | Competencia destino. Parte de la clave única de R-2. Validada contra R-3 (destino válido). |
| `planId` | Id | sí | FK a `Plan.id` | derivado | **NUEVO** | Denormalizado. Lo deriva el servidor de `planEntry.planId` en cada create y en cada modify que cambie `planEntryId`. El valor que envía el cliente se ignora, no es fuente de verdad (REQ-01). |
| `developmentLevel` | Id | sí | FK a `CompetencyNodeDevelopmentLevel.id` | ninguno | EXISTENTE, ver 2.4 | Nivel de desarrollo, columna de la grilla. Es lo que la tabla de detalle muestra como "Cobertura" (REQ-16). Debe pertenecer al conjunto de niveles declarados por `competencyNodeId` (R-4, REQ-06). Es el único campo que cambia en un move (R-10). |
| `contributionType` | Enum | sí | dominio de tipos de contribución | `Develops` | EXISTENTE, default y obligatoriedad se hacen cumplir en este ticket | R-5, REQ-07. Si la operación no lo especifica, el resolver aplica `Develops`. Un valor vacío o fuera del dominio se rechaza y no borra el valor existente. |
| `contributionPercentage` | Number | no | ninguno | nulo | FUERA DE ALCANCE | Pesos van en UPONE-1770. No se lee ni se escribe aquí. |
| campos de auditoría de plataforma (creado por, creado en, modificado por, modificado en) | según convención de la plataforma | según convención | ninguno | automático | EXISTENTE | Se dejan a cargo de la plataforma. Este ticket no agrega versionado propio (R-8 excluido, ver REQ-09 y sección 7). |

### 2.2 Origen y autoridad de `planId`

`planId` es dato derivado, no dato de entrada:

1. En `create`: el resolver lee `planEntry.planId` del `planEntryId` recibido y lo escribe. Si el cliente manda `planId`, se descarta.
2. En `modify` que cambia `planEntryId`: se recalcula `planId` desde el nuevo `planEntry`. Un modify que no toca `planEntryId` deja `planId` intacto.
3. En un move (cambio de `developmentLevel`): `planId` no cambia, porque el `planEntry` no cambia.

Razón de la denormalización: la grilla, el conteo de tributaciones por asignatura del panel lateral y los filtros "Con tributación" y "Sin tributar" (REQ-13) consultan siempre por plan. Sin `planId` cada lectura obliga a un join contra `PlanEntry` para filtrar. El costo es el riesgo de desincronización, mitigado por la regla de que solo el servidor escribe este campo y por la verificación de consistencia descrita en la sección 6.

### 2.3 Reglas server-side que actúan sobre esta entidad

Todas viven en el resolver gobernado, no en el cliente (REQ-10). Se listan aquí porque condicionan el modelo, no solo el comportamiento:

| Regla | Qué valida | Datos que necesita |
|---|---|---|
| R-1 (REQ-03) | Que la matriz del `competencyNodeId` tenga adopción vigente para el plan del `planEntry`. | `CompetencyNode.matrixId`, `MatrixAdoption` por (planId, matrixId) y su vigencia. |
| R-2 (REQ-04) | Unicidad del par (`planEntryId`, `competencyNodeId`) en create y en modify. | Índice único, ver 2.5. |
| R-3 (REQ-05) | Destino válido solo si el nodo no tiene hijos o si `isHolistic` es verdadero. "Sin hijos" se deriva del árbol, no de un campo. | `CompetencyNode.parentId` (conteo de hijos), `CompetencyNode.isHolistic`. |
| R-4 (REQ-06) | `developmentLevel` pertenece a los niveles declarados por esa competencia. | `CompetencyNodeDevelopmentLevel` filtrado por `competencyNodeId`. |
| R-5 (REQ-07) | `contributionType` obligatorio, default `Develops`, dominio cerrado. | Enum del campo. |
| R-10 (REQ-08) | Asignar sobre una competencia ya tributada por esa asignatura resuelve a update de la fila existente. | Lookup por el par único antes de decidir create o update. |
| Capabilities (REQ-02) | `competencyalignment:view/create/modify/delete` según la operación. | Ver sección 5. |

### 2.4 Nota sobre el nombre del campo de nivel

El request declara fuera de alcance el rename destructivo de `coverageLevelId` y `CoverageScheme`, que va en UPONE-1769. Consecuencia para este ticket:

- El campo de nivel de la tributación **conserva el nombre que tiene hoy en el objeto**. No se renombra aquí.
- La lectura del dominio de valores **sí** pasa a `CompetencyNodeDevelopmentLevel` (R-4, REQ-06), y la UI lo rotula "Cobertura" en la tabla de detalle y "nivel" en el aria-label del chip.
- Queda entonces una asimetría transitoria y consciente: nombre físico del campo por un lado, semántica y fuente del dominio por otro. UPONE-1769 la cierra.

Acción requerida antes de codificar: confirmar el nombre físico exacto del campo en el objeto actual (ver sección 8). En este documento se lo nombra `developmentLevel` por su semántica.

### 2.5 Índices

| Índice | Columnas | Tipo | Marca | Para qué |
|---|---|---|---|---|
| `uq_competencyalignment_entry_node` | (`planEntryId`, `competencyNodeId`) | ÚNICO | **NUEVO** | Hace cumplir R-2 en la base, no solo en el resolver. Es la red de seguridad frente a escrituras concurrentes por vías distintas (UI y MCP a la vez). |
| `ix_competencyalignment_plan` | (`planId`) | no único | **NUEVO** | Lecturas por plan: grilla, conteos del panel lateral, filtros. Es la razón de ser de la denormalización. |
| `ix_competencyalignment_plan_node` | (`planId`, `competencyNodeId`) | no único | **NUEVO** | Carga de la grilla fila por fila de competencia y de la tabla de detalle al expandir una competencia (REQ-16). |
| `ix_competencyalignment_node` | (`competencyNodeId`) | no único | EXISTENTE si ya está, si no NUEVO | Consultas por competencia sin filtro de plan. |
| índice implícito de FK `planEntryId` | (`planEntryId`) | no único | EXISTENTE | Ya cubierto como prefijo del índice único; no se agrega otro. |

Nota de orden: `ix_competencyalignment_plan_node` cubre por prefijo las consultas por `planId` solo, por lo que `ix_competencyalignment_plan` es redundante si el motor aprovecha el prefijo. Se listan ambos para decidir en implementación; recomendación: crear solo el compuesto (`planId`, `competencyNodeId`) y evaluar el simple con el plan de ejecución real.

---

## 3. CompetencyNode (EXISTENTE, solo lectura)

No cambia. Se consume para R-3 y para armar las filas de la grilla.

| Campo | Tipo | Obligatorio | Uso en este ticket |
|---|---|---|---|
| `id` | Id | sí | Destino de `CompetencyAlignment.competencyNodeId`. |
| `matrixId` | Id, FK a `CompetencyMatrix.id` | sí | Entrada de R-1: de qué matriz es la competencia, para buscar su adopción. |
| `parentId` | Id, FK auto-referencia a `CompetencyNode.id` | no | Deriva "sin hijos" para R-3. Un nodo es hoja si ningún otro nodo lo tiene como `parentId`. |
| `isHolistic` | Boolean | sí | Segunda vía de destino válido en R-3. |
| `code` | String | sí | Ficha CODIGO de la grilla y aria-label del chip. |
| `name` | String | sí | Nombre de la competencia en la fila y en el aria-label. |

Derivaciones, no campos nuevos:

- `esDestinoValido` = (cero hijos) OR (`isHolistic` verdadero). No se persiste. Se calcula en el resolver y se expone a la UI como conveniencia para no ofrecer "Asignar acá" en celdas inválidas (REQ-17), pero la autoridad es el resolver.
- Invariante de matriz inválida (REQ-05): un nodo con `isHolistic` falso y cero hijos es matriz inválida. No se corrige con dato; se reporta como tal. No agrega columna, agrega una verificación de integridad consultable.

---

## 4. Entidades consumidas sin cambios

### 4.1 CompetencyNodeDevelopmentLevel (EXISTENTE, solo lectura)

Define las columnas de la grilla por competencia y el dominio de R-4.

| Campo | Tipo | Obligatorio | Uso |
|---|---|---|---|
| `id` | Id | sí | Valor referenciado por `CompetencyAlignment.developmentLevel`. |
| `competencyNodeId` | Id, FK a `CompetencyNode.id` | sí | Los niveles se declaran por competencia, por eso dos filas de la grilla pueden tener columnas distintas. |
| nombre del nivel | String | sí | Rótulo de la columna y texto "nivel" del aria-label, por ejemplo Introduce, Reinforce, Master. |
| orden | Integer | según objeto | Orden de las columnas de izquierda a derecha. |

Consecuencia de diseño para la grilla: las columnas no son un enum global del mod, son datos por fila. La grilla es competencia por competencia, con su propio juego de columnas.

Migración de niveles de matrices existentes: FUERA DE ALCANCE, va en UPONE-1773.

### 4.2 MatrixAdoption (EXISTENTE, solo lectura)

| Campo | Tipo | Obligatorio | Uso |
|---|---|---|---|
| `id` | Id | sí | |
| `planId` | Id, FK a `Plan.id` | sí | Lado plan de R-1. |
| `matrixId` | Id, FK a `CompetencyMatrix.id` | sí | Lado matriz de R-1. |
| campos de vigencia o estado de la adopción | según objeto | sí | R-1 exige adopción **vigente**, no solo existente. |

Este ticket no gestiona adopciones: Eximir, Cerrar y "Planes que adoptan" son contexto de solo lectura y no se construyen. La ausencia de adopción se refleja en el estado vacío literal "Este plan no ha adoptado ninguna matriz de competencia" (REQ-12).

### 4.3 PlanEntry (EXISTENTE, solo lectura)

| Campo | Tipo | Obligatorio | Uso |
|---|---|---|---|
| `id` | Id | sí | Lado asignatura de la tributación. |
| `planId` | Id, FK a `Plan.id` | sí | **Fuente de verdad de `CompetencyAlignment.planId`** (REQ-01). |
| código de la asignatura | String | sí | Panel lateral, chip, columna Código de la tabla de detalle. |
| nombre de la asignatura | String | sí | Panel lateral y columna Asignatura. |
| período | según objeto | según objeto | Columna Período de la tabla de detalle (REQ-16). |

El panel lateral consume exactamente estos `planEntry`, mismo origen de datos que la malla (REQ-13). Nada de esta lista se inventa ni se duplica.

Derivación para el badge del panel lateral: conteo de `CompetencyAlignment` por `planEntryId` dentro del `planId` actual. Alimenta "1 TRIBUTACION(ES)" y "SIN TRIBUTAR" y los filtros Todas, Con tributación y Sin tributar. Es agregación en consulta, no columna materializada. Si el volumen lo justifica, la optimización natural es un agrupado por `planEntryId` apoyado en el índice único, no un contador denormalizado, para no introducir un segundo dato que pueda desincronizarse.

### 4.4 Plan y CompetencyMatrix (EXISTENTE, solo lectura)

Se consumen para el selector de matriz del tab y para resolver R-1. Sin cambios de modelo.

---

## 5. Capabilities y su cableado (NUEVO)

REQ-02. Cuatro capabilities nuevas declaradas en el mod `curriculum-mapping`:

| Capability | Operación que gobierna |
|---|---|
| `competencyalignment:view` | Lectura de la grilla, del panel lateral, de la tabla de detalle. Gatea la visibilidad del tab (REQ-11). |
| `competencyalignment:create` | Asignar una tributación nueva. |
| `competencyalignment:modify` | Editar Cobertura o Contribución, y mover (R-10 es un modify, no un create). |
| `competencyalignment:delete` | Retirar una tributación. |

Datos involucrados:

| Elemento | Marca | Notas |
|---|---|---|
| Declaración de las cuatro capabilities en la configuración de capabilities del mod | **NUEVO** | Nombres exactos según la tabla anterior. |
| Asignación de las cuatro capabilities a los cuatro roles curriculares (tabla de unión rol a capability de la plataforma) | **NUEVO** | Cuatro roles por cuatro capabilities, dieciséis asignaciones si los cuatro roles reciben las cuatro. Confirmar en implementación si algún rol curricular debe quedar solo con `view`; el request dice "cableadas a los 4 roles curriculares" sin distinguir, y esa lectura literal es la que se asume. |
| Verificación de capability en cada mutación del resolver gobernado | **NUEVO** | REQ-02 y REQ-10. Vale igual para UI, API y MCP. |

Efecto en la UI, conveniencia y no autoridad (REQ-17): sin capability de escritura la vista muestra el indicador "Solo lectura" y no ofrece asignar, quitar ni editar. La supresión visual no sustituye la verificación server-side.

Consideración de granularidad de `modify`: mover y editar comparten una sola capability. Si el negocio necesitara distinguir "mover" de "cambiar contribución", haría falta una quinta capability. El request no lo pide y agregarla sin pedido es deuda innecesaria; se documenta como punto de extensión, no se implementa.

---

## 6. Notas de migración

Orden obligatorio. Cada paso deja el sistema funcional.

### Paso 1, detectar duplicados antes de tocar el esquema

El índice único de R-2 fallará si ya existen pares (`planEntryId`, `competencyNodeId`) repetidos. Antes de cualquier DDL: agrupar `CompetencyAlignment` por ese par y listar los grupos con más de una fila.

- Si hay cero duplicados: seguir.
- Si hay duplicados: **detenerse y reportar** con los ids afectados. La resolución de duplicados preexistentes es dato de negocio, no decisión técnica del ticket, y la migración de datos está declarada fuera de alcance. No borrar ni fusionar filas por iniciativa propia.

### Paso 2, agregar `planId` como opcional

Alta de la columna aceptando nulos. No rompe lecturas ni escrituras existentes.

### Paso 3, backfill de `planId`

Poblar `planId` para toda fila existente desde `planEntry.planId` vía `planEntryId`. Riesgos concretos a verificar en este paso:

- Filas con `planEntryId` que apunta a un `planEntry` inexistente (FK huérfana): no podrán poblarse. Reportar, no inventar `planId`.
- Filas con `planEntryId` nulo, si el esquema actual lo permitiera: mismo tratamiento.

Verificación de cierre del paso: cero filas con `planId` nulo. Si queda alguna, el paso 4 no se ejecuta.

### Paso 4, volver `planId` obligatorio

Solo con el backfill verificado en cero nulos.

### Paso 5, crear índices

Primero el único (`planEntryId`, `competencyNodeId`), después el compuesto (`planId`, `competencyNodeId`). El único puede fallar aquí si entraron duplicados entre el paso 1 y este punto; correrlo en ventana sin escritura o repetir la detección del paso 1 inmediatamente antes.

### Paso 6, verificación de consistencia de la denormalización

Consulta de control, dejarla como verificación repetible y no solo como paso único de migración: toda fila donde `CompetencyAlignment.planId` sea distinto de `planEntry.planId` es inconsistente. El resultado esperado es cero filas, en la migración y en cualquier momento posterior. Es la contrapartida obligatoria de haber denormalizado.

### Paso 7, verificación del invariante de R-3

Listar nodos con `isHolistic` falso y cero hijos. Cada uno es matriz inválida y se reporta (REQ-05). No se corrige con migración: no hay dato correcto que inferir, es un problema de la matriz. Solo se hace visible.

### Reversibilidad

- Pasos 2 a 4 (`planId`): reversibles quitando la columna. Se pierde solo dato derivable, recalculable desde `planEntry`.
- Paso 5 (índices): reversible quitando índices. Quitar el único reintroduce el riesgo de duplicados de R-2 en la base, quedando R-2 defendido solo por el resolver.
- Capabilities: reversible quitando las asignaciones. Al quitarlas, el tab deja de mostrarse por falta de `competencyalignment:view` (REQ-11).
- Ningún paso borra ni transforma datos de tributación existentes, por lo que la migración no tiene pérdida irreversible.

---

## 7. Deuda explícita registrada en el modelo

- **Retiro sin salvaguarda (REQ-09)**: el delete de `CompetencyAlignment` es un delete simple de la fila, sin aviso de dependencias. Es seguro únicamente mientras `outcomeAlignment` (F6) no exista. Al entrar UPONE-1772, el retiro debe ganar el aviso R-7, nombrar los resultados de aprendizaje dependientes antes de borrar. Consecuencia de modelo: cuando exista `outcomeAlignment` habrá una relación entrante hacia `CompetencyAlignment` que hoy no está representada, y el delete pasará a necesitar una lectura de dependientes previa. No cerrar el retiro como definitivo sin esa salvaguarda.
- **Sin versionado (R-8 excluido)**: no se agregan campos de historial ni tabla de versiones de tributación. El único rastro de cambios es la auditoría estándar de la plataforma.
- **Nombre `coverageLevelId` y `CoverageScheme`**: se conservan; el rename va en UPONE-1769. Ver sección 2.4.
- **Niveles de matrices existentes**: la migración de niveles hacia `CompetencyNodeDevelopmentLevel` es de UPONE-1773. Este ticket asume que las matrices sobre las que se tributa ya declaran sus niveles. Si una competencia no declara ninguno, su fila de la grilla queda sin columnas y no admite asignación por R-4; es un caso a reportar, no a resolver con datos por defecto.
- **`contributionPercentage`**: existe en el objeto y queda intacto, ni leído ni escrito. Los pesos son de UPONE-1770.
- **Contador de tributaciones no materializado**: el badge del panel lateral se calcula por agregación. Si el volumen lo exige, la decisión de materializarlo debe evaluarse aparte, con el mismo criterio de riesgo de desincronización que se aceptó para `planId`.

---

## 8. Verificaciones pendientes contra el código antes de implementar

Estos puntos se afirman en este documento con la semántica del request, pero su nombre o forma exacta debe confirmarse en el objeto real del mod. No implementar sin cerrarlos:

1. Nombre físico actual del campo de nivel en `CompetencyAlignment`, `coverageLevelId` u otro, y a qué apunta hoy (ver 2.4).
2. Nombre y dominio exacto del enum de `contributionType`, para confirmar que `Develops` es un valor válido del dominio y no un rótulo de UI.
3. Forma de la vigencia en `MatrixAdoption`, campo de estado, fechas o ambos, dato que R-1 necesita para decidir "vigente".
4. Nombre del campo de período en `PlanEntry`, para la columna Período de la tabla de detalle.
5. Si ya existe un índice único sobre (`planEntryId`, `competencyNodeId`), en cuyo caso el paso 5 de la migración se reduce.
6. Los cuatro roles curriculares concretos a los que se cablean las capabilities, y si todos reciben las cuatro o alguno queda solo con `view`.