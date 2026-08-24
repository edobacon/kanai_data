# InstructionalComponent: tickets de implementación

> Tickets ejecutables derivados del plan de re-implementación (`instructional-component-plan-implementacion.md`). Tres épicas (una por mod), 16 tickets. Cada ticket reencapsula su contexto técnico para ser autocontenido.
>
> Cada ticket lleva dos ejes independientes:
> - **Esfuerzo** (cuánto trabajo): Trivial · Menor · Considerable · Mayor (Mayor es el techo del ticket).
> - **Sensibilidad** (cuánto cuidado): Baja (aditivo/reversible) · Media (cambia un comportamiento consumido o toca un objeto core) · Alta (destructivo; consentimiento por tenant + coordinación con core).
>
> Son ejes distintos: un cambio puede ser poco trabajo y muy sensible a la vez (ej. eliminar una columna). Escala completa en `escala-esfuerzo.md`.
>
> Plataforma de referencia: `uplanner/up1`. Fecha: 2026-08-12.

---

## Definition of Done compartido

Aplica a todo ticket que toca esquema. Cada ticket agrega sobre esto sus criterios de aceptación propios.

```
[ ] JSON del objeto + codegen sin errores
[ ] prisma migrate aplicado (aditivo) — si es destructivo, consentimiento por tenant
[ ] Seeds actualizados y corriendo verde
[ ] Tests de conteo/integración actualizados y verdes
[ ] npm run sync sin drift; drift:check verde
[ ] Layouts renderizan (smoke real, no solo config)
[ ] Capabilities/RBAC definidas para objetos nuevos
[ ] i18n de labels nuevos
[ ] lint/typecheck verdes; sin console.* en prod
[ ] PR revisado
```

---

## Épica 1 · curriculum-design: modelar la pieza de dictado

**Objetivo de la épica**: el curso pasa a declarar sus piezas de dictado (cátedra/lab/taller) con sus horas, y la modalidad deriva su carga de ellas.
**Resultado esperado**: un curso creado desde el formulario de CD tiene modalidades con piezas, y las horas ya no se digitan en la modalidad.

### Ticket 1A · Catálogo `InstructionalComponentType`

- **Esfuerzo**: Menor · **Sensibilidad**: Baja
- **Objetivo**: existe un catálogo de tipos de pieza que la pieza referencia.
- **Contexto**: hoy no hay ningún catálogo de tipos de pieza de dictado.
- **Cambios técnicos**: nuevo objeto base JSON en `curriculum-design/objects/`, campos `name` (unique), `code`, `priority` opcional (patrón de `ResourceTypes`). `codegen` genera tabla Prisma y tipo GraphQL; `migrate` crea la tabla (aditivo). Seed `config-<componenttype>.js` (patrón de `config-resourcetypes.js`) que puebla Cátedra, Práctica, Laboratorio, Taller, Seminario, Ayudantía, Clínica, Terreno, idempotente por `name`; corre antes de `_data-syllabus-sections.js`.
- **Criterios de aceptación**: el catálogo se puede listar con los 8 tipos; `name` es único.
- **Test cases**: alta idempotente por `name` (re-seed no duplica); rechazo de `name` duplicado.
- **Dependencias**: ninguna (arranca la épica).
- **Riesgo / rollback**: aditivo; rollback = revertir JSON + regenerar.
- **DoD**: compartido.

### Ticket 1B · Objeto `InstructionalComponent` (RecordType)

- **Esfuerzo**: Considerable · **Sensibilidad**: Baja
- **Objetivo**: existe la pieza como RecordType de `CurricularSection`, hija de la modalidad.
- **Contexto**: `CurricularSection` es el árbol polimórfico del sílabo (`ownerType`/`ownerId` + `parentId` composite). Modelar la pieza como RT reusa el árbol, el `record-list` embebido, los associated layouts y el `deepClone` de subárboles que CD ya tiene.
- **Cambios técnicos**: nuevo `curriculum-design/objects/RecordTypes/rt__InstructionalComponent__curricularsection.json`. Campos propios: `componentTypeId` (FK a `InstructionalComponentType`), `hoursPerWeek`, `plannedGroupSize`, `requiredInstructorCount`, `deliveryLocation`, `synchronicity`, `isPrimary`, `requiresOwnSection`. Hereda de CurricularSection: `name`, `position`, `ownerType`, `ownerId`, `parentId`, `recordType`. Registrar en el set de `recordtypes-declared`. Layouts `default_rt__InstructionalComponent__curricularsection_{create,edit,view}`. El FK `componentTypeId` es id escalar (patrón RT de up1). Anida por `parentId` al nodo Modality.
- **Criterios de aceptación**: se crea una pieza colgando de una modalidad con todos sus campos; aparece en el set de `recordtypes-declared`.
- **Test cases**: crear pieza válida; pieza sin `componentTypeId` (rechazo si es requerido); `recordtypes-declared.test.ts` incluye el nuevo RT.
- **Dependencias**: blocked by 1A.
- **Riesgo / rollback**: aditivo; rollback = revertir JSON + regenerar.
- **DoD**: compartido.

### Ticket 1C-a · Derivación de horas de la modalidad

- **Esfuerzo**: Considerable · **Sensibilidad**: Baja
- **Objetivo**: la modalidad muestra su total de horas derivado de las piezas, conviviendo aún con las columnas viejas.
- **Contexto**: hoy `rt__Modality__curricularsection.json` digita `theoryHours/practiceHours/labHours/autonomousHours`. Ningún resolver las consume: el único código que toca el RT es el guard de `isDefault` (`curriculum-design/logic/helpers/modalityDefault.js:37-59`), que no lee horas.
- **Cambios técnicos**: agregar el cálculo del total de horas de la modalidad sumando `hoursPerWeek` de sus piezas hijas, en el resolver de lectura o como campo computado del layout. Las 4 columnas de horas siguen existiendo en esta etapa (convivencia): no se eliminan aquí.
- **Criterios de aceptación**: modalidad con piezas 4h + 2h muestra total derivado 6h; modalidad sin piezas muestra 0.
- **Test cases**: derivación con 2 piezas (4+2 → 6); modalidad sin piezas → 0.
- **Dependencias**: blocked by 1B.
- **Riesgo / rollback**: aditivo (no toca columnas); reversible al instante.
- **DoD**: compartido.

### Ticket 1C-b · Drop de columnas de horas de Modality + migración

- **Esfuerzo**: Menor · **Sensibilidad**: Alta
- **Objetivo**: retirar las 4 columnas de horas de Modality una vez la derivación está viva y verificada.
- **Contexto**: con la derivación de 1C-a funcionando, las columnas de horas de Modality quedan sin uso. En up1 el drop no se codea a mano: se edita el JSON del modelo, `codegen` regenera y el `sync` genera y aplica la migración por tenant; el trabajo de código es acotado.
- **Cambios técnicos**: editar `rt__Modality__curricularsection.json` quitando `theoryHours/practiceHours/labHours/autonomousHours` (conserva `code`, `isDefault`, `deliveryMode`). `codegen` regenera; el `sync`/`migrate` elimina las 4 columnas. Si hay dato productivo, backfill previo que traduce las horas existentes a piezas antes del drop. El guard de `isDefault` queda intacto. Handoff a core para actualizar su modelo.
- **Criterios de aceptación**: no existe columna ni input de horas en Modality; el guard de `isDefault` sigue vigente; el dato productivo con horas fue migrado a piezas antes del drop.
- **Test cases**: regresión `isDefault` (una default por dueño); verificación de que el backfill generó piezas por cada modalidad que tenía horas.
- **Dependencias**: blocked by 1C-a; usa el loader de 1E-a para el backfill.
- **Riesgo / rollback**: destructivo (irreversible sin backfill), requiere consentimiento por tenant y coordinación con core. Rollback = restaurar JSON + regenerar; el dato de horas se pierde si no hubo backfill. Se mantiene separado de 1C-a por **sensibilidad**, no por esfuerzo: se despliega el drop sobre una derivación ya probada. Ticket atómico.
- **DoD**: compartido, con consentimiento explícito por tenant para el drop.

### Ticket 1D · Formulario del curso con piezas anidadas

- **Esfuerzo**: Considerable · **Sensibilidad**: Media
- **Objetivo**: el tab Modalidades del curso permite gestionar piezas por modalidad.
- **Contexto**: `default_Activity_edit` es tabbed; el tab Modalidades usa un `record-list` embebido; los layouts de sílabo leen hoy las horas de Modality.
- **Cambios técnicos**: en `default_Activity_edit.json`, el sub-layout de cada modalidad incorpora un `record-list` anidado de `InstructionalComponent` (filtrado por `parentId` de la modalidad), con `canCreateLayoutId` a los layouts de 1B. Ajustar `default_rt__Modality__curricularsection_{create,edit,view}.json` para quitar los inputs de horas y mostrar el total derivado. Reapuntar `default_Offering_syllabus_{view,edit}.json` que leen las keys de horas. `Content` y `Session` sin cambios.
- **Criterios de aceptación**: crear curso → modalidad → agregar 2 piezas → ver total derivado (smoke real); el sílabo (`default_Offering_syllabus_view`) ya no rompe por las keys de horas.
- **Test cases**: smoke real del render (no solo config); vista de sílabo sin las horas de Modality.
- **Dependencias**: blocked by 1B, 1C-b.
- **Riesgo / rollback**: cambios de layout (config), reversibles. Riesgo conocido: el RecordList filtra columnas a campos reales del objeto; verificar el render real, no solo config + BD.
- **DoD**: compartido.

### Ticket 1E-a · Extender el loader del seed para `parentId`

- **Esfuerzo**: Considerable · **Sensibilidad**: Media
- **Objetivo**: el loader del seed de sílabo puede anclar un registro a una modalidad por `parentId`.
- **Contexto**: el loader (`_data-syllabus-sections.js:387-417`) separa campos base vs satélite y ancla todo con `ownerType:'Activity', ownerId`, **sin `parentId`**: Modality/Content/Session son hermanos bajo la Activity.
- **Cambios técnicos**: extender el loader para resolver el id de la modalidad por `(ownerActivityCode, recordType=Modality, code=PRES)` y setar `parentId` en los registros de tipo pieza. Es un cambio de capacidad del loader, no de datos.
- **Criterios de aceptación**: el loader ancla un registro de pieza a su modalidad vía `parentId`.
- **Test cases**: sembrar una pieza y verificar que `parentId` apunta a la modalidad correcta.
- **Dependencias**: blocked by 1B.
- **Riesgo / rollback**: si el anidamiento se generaliza mal, afecta a otros RT; acotar la resolución al caso pieza.
- **DoD**: compartido.

### Ticket 1E-b · Reescribir datos del seed de sílabo + tests de conteo

- **Esfuerzo**: Menor · **Sensibilidad**: Baja
- **Objetivo**: el seed refleja el nuevo modelo (horas en las piezas, no en la modalidad).
- **Contexto**: el array `SECTIONS` tiene 11 registros Modality con horas (líneas 10-20), 55 Content y 176 Session. `tests/integration/seed-counts.test.ts:451-459` aserta 374 CurricularSection en 7 recordTypes; `docs/reference/seed-counts.md:60` documenta los conteos.
- **Cambios técnicos**: quitar los 4 campos de horas de cada registro Modality y agregar registros hijos `InstructionalComponent` con `parentId`. Ejemplo `C-CALCULOI-001`: la modalidad "Presencial" gana piezas "Cátedra" (`hoursPerWeek: 4`) y "Práctica" (`hoursPerWeek: 2`). `Content` y `Session` no cambian. Actualizar `seed-counts.test.ts` (nuevo recordType + N piezas) y `seed-counts.md`.
- **Criterios de aceptación**: re-seed idempotente (no duplica piezas); conteo actualizado en verde; sembrar un curso desde cero produce piezas con horas.
- **Test cases**: idempotencia de re-seed; conteo actualizado verde.
- **Dependencias**: blocked by 1A, 1B, 1E-a.
- **Riesgo / rollback**: cambio de datos; bajo. Rollback = revertir el seed.
- **DoD**: compartido.

---

## Épica 2 · academic-scheduling: anclar la planificación a la pieza

**Objetivo de la épica**: la sección planifica una pieza concreta dentro de un combo (cluster), deriva su cupo de la pieza y alimenta el algoritmo con el cluster.
**Resultado esperado**: se abren secciones ancladas a piezas y agrupadas en clusters; el algoritmo respeta el "parent".

### Ticket 2A · Objeto `SectionCluster`

- **Esfuerzo**: Menor · **Sensibilidad**: Baja
- **Objetivo**: existe el combo válido de secciones (una por pieza).
- **Contexto**: no hay entidad de cluster; el algoritmo ya declara `id_parent`/`id_master_section`/`STRICT_PARENT_ASSIGNMENT` (`config-rule-definitions.js:74-80`) pero sin backing de datos.
- **Cambios técnicos**: nuevo `academic-scheduling/objects/SectionCluster.json`. Campos: `modalityId` (FK cross-mod a CurricularSection recordType=Modality), `termId` (FK), `code`. Unique sugerido `[modalityId, termId, code]`. `codegen`/`migrate`: tabla nueva (aditivo).
- **Criterios de aceptación**: se crea un cluster con `modalityId`+`termId`+`code`; unique rechaza duplicados.
- **Test cases**: alta válida; rechazo de duplicado por unique.
- **Dependencias**: ninguna dentro de la épica (la épica va después de la 1).
- **Riesgo / rollback**: aditivo; rollback = revertir JSON + regenerar.
- **DoD**: compartido.

### Ticket 2B-a · FKs de pieza y cluster en `Section`

- **Esfuerzo**: Menor · **Sensibilidad**: Baja
- **Objetivo**: la sección puede referenciar la pieza y el cluster.
- **Contexto**: `Section` ya referencia `CurricularSection` vía `Section.modalityId` (FK escalar, `Section.json:108-116`).
- **Cambios técnicos**: agregar `instructionalComponentId` (FK cross-mod a CurricularSection recordType=InstructionalComponent) y `sectionClusterId` (FK a `SectionCluster`), ambos nullable. `codegen`/`migrate`: 2 columnas nullable (aditivo). El unique `[activityId, termId, code]` se mantiene.
- **Criterios de aceptación**: `Section` acepta ambos FKs; unique intacto.
- **Test cases**: crear sección con ambos FKs; regresión del unique.
- **Dependencias**: blocked by 2A y por Épica 1 (la pieza debe existir).
- **Riesgo / rollback**: aditivo; rollback = revertir JSON + regenerar.
- **DoD**: compartido.

### Ticket 2B-b · Derivación de cupo/módulos desde la pieza

- **Esfuerzo**: Considerable · **Sensibilidad**: Media
- **Objetivo**: al crear una sección, su cupo y módulos se toman de la pieza.
- **Contexto**: hoy `capacity`/`weeklyModules` son manuales; el algoritmo lee `Section.weeklyModules` como `nm_week_modules`.
- **Cambios técnicos**: el resolver de creación de Section toma `plannedGroupSize` de la pieza → `capacity` y `hoursPerWeek` → `weeklyModules`, y los persiste (derivación en escritura, con override manual). `requiredInstructors` se alinea con `requiredInstructorCount` de la pieza.
- **Criterios de aceptación**: crear sección con pieza → cupo/módulos derivados; override manual respetado.
- **Test cases**: derivación desde la pieza; override manual respetado; el algoritmo sigue leyendo `weeklyModules` correcto.
- **Dependencias**: blocked by 2B-a, Épica 1.
- **Riesgo / rollback**: cambia el comportamiento que el algoritmo consume (`weeklyModules`); probar que no rompe la asignación.
- **DoD**: compartido.

### Ticket 2C · Herencia de tipos de recurso

- **Esfuerzo**: Considerable · **Sensibilidad**: Baja
- **Objetivo**: la sección hereda los tipos de recurso de la pieza.
- **Contexto**: `SectionResourceType` (N:M `Section`↔`ResourceTypes`) ya existe; la pieza declara `requiredResourceTypes`.
- **Cambios técnicos**: el resolver de creación de Section, al conocer la pieza, crea las filas `SectionResourceType` correspondientes a los tipos declarados por la pieza. No se crea objeto nuevo (reusa el N:M existente).
- **Criterios de aceptación**: al crear una sección de una pieza con 2 tipos, se crean 2 filas `SectionResourceType`; pieza sin tipos → 0 filas.
- **Test cases**: materialización de 2 tipos; pieza sin tipos → 0; integración contra BD real (no mock).
- **Dependencias**: blocked by 2B-a (y por la declaración de lista en la pieza, Épica 1).
- **Riesgo / rollback**: reusa N:M; revisar duplicados con `populate-resources`.
- **DoD**: compartido.

### Ticket 2D · Algoritmo: poblar `id_parent` desde el cluster

- **Esfuerzo**: Considerable · **Sensibilidad**: Media
- **Objetivo**: el algoritmo recibe el "parent" desde `SectionCluster`.
- **Contexto**: `SORT_PARAMETERS_CLASSROOM_ASSIGNMENT` incluye `id_parent`/`id_master_section` pero no se pueblan desde una entidad; `STRICT_PARENT_ASSIGNMENT=1`.
- **Cambios técnicos**: `scheduling-inputs.resolver.js` empieza a emitir `id_parent`/`id_master_section` desde `sectionClusterId` en el payload del algoritmo. Los flags `STRICT_PARENT_ASSIGNMENT`/`PARENT_SAME_CLASSROOM`/`PARENT_SAME_TEACHER` no cambian de forma; ganan semántica real.
- **Criterios de aceptación**: el payload incluye `id_parent` para secciones del mismo cluster; con `STRICT_PARENT_ASSIGNMENT=1` el algoritmo agrupa el combo (todo o nada).
- **Test cases**: payload con `id_parent` para secciones del mismo cluster; escenario del algoritmo con cluster teoría+lab (todo o nada).
- **Dependencias**: blocked by 2A, 2B-a.
- **Riesgo / rollback**: cambia el payload del algoritmo externo; validar con un escenario controlado antes de generalizar.
- **DoD**: compartido.

### Ticket 2E-a · Seed de `SectionCluster`

- **Esfuerzo**: Menor · **Sensibilidad**: Baja
- **Objetivo**: los clusters demo existen antes que las secciones.
- **Contexto**: `dbSync.js` **no ordena** los seeds (itera `fs.readdir` sin `.sort()`); el orden por prefijo es convención.
- **Cambios técnicos**: seed nuevo que crea los clusters (uno por modalidad+término), con un prefijo que ordene antes de las secciones (ej. `populate-0-...`).
- **Criterios de aceptación**: los clusters se siembran antes de las secciones; re-seed idempotente.
- **Test cases**: existencia de clusters; ejecución antes de las secciones.
- **Dependencias**: blocked by 2A.
- **Riesgo / rollback**: orden de seeds no garantizado por el sync; asegurar por prefijo.
- **DoD**: compartido.

### Ticket 2E-b · Reescribir `populate-sections` + backfill + tests

- **Esfuerzo**: Considerable · **Sensibilidad**: Baja
- **Objetivo**: las secciones demo reflejan pieza + cluster.
- **Contexto**: `populate-sections.js:127-140` crea secciones demo (2 cursos × 2) sin `modalityId` ni FKs nuevas; tiene backfill idempotente (`missingFields`).
- **Cambios técnicos**: setear `instructionalComponentId` y `sectionClusterId`; `capacity`/`weeklyModules` desde la pieza; materializar filas `SectionResourceType`; extender `missingFields` a los campos nuevos. Revisar los tests de conteo de Section.
- **Criterios de aceptación**: secciones demo con pieza + cluster; backfill extendido; tests de Section verdes.
- **Test cases**: re-seed idempotente; conteo de Section verde; secciones con `SectionResourceType` materializado.
- **Dependencias**: blocked by 2A, 2B-a, 2B-b, 2C, 2E-a.
- **Riesgo / rollback**: bajo; revisar coherencia de `SectionResourceType` con `populate-resources`.
- **DoD**: compartido.

### Ticket 2E-c · Reescribir `populate-zzz-calendar-demo` (1000 secciones)

- **Esfuerzo**: Considerable · **Sensibilidad**: Baja
- **Objetivo**: las 1000 secciones del seed de calendario reflejan pieza + cluster.
- **Contexto**: `populate-zzz-calendar-demo.js:360-377` crea 1000 Section con el mismo shape que `populate-sections`, sin `modalityId`.
- **Cambios técnicos**: aplicar los mismos cambios de 2E-b a las 1000 secciones (pieza + cluster; cupo derivado).
- **Criterios de aceptación**: ninguna de las 1000 secciones queda sin cluster (rompería el algoritmo, que ahora espera `id_parent`).
- **Test cases**: muestreo de secciones con cluster; conteo total.
- **Dependencias**: blocked by 2A, 2B-a, 2E-a.
- **Riesgo / rollback**: volumen (1000); verificar que ninguna quede sin cluster.
- **DoD**: compartido.

---

## Épica 3 · uengagement: matrícula del curso (punto abierto)

**Objetivo de la épica**: definir e implementar cómo se matricula un curso. Depende de una decisión de negocio (grano) y del cluster de la Épica 2.

### Ticket 3A · Spike de decisión (grano de matrícula)

- **Esfuerzo**: Menor · **Sensibilidad**: n/a (no implementa)
- **Objetivo**: el equipo de engagement elige el grano (curso/término vs paralelo) y con qué mecanismo.
- **Contexto**: ya existe un camino de matrícula de curso (`Activity(Course) → Offering(recordType=Syllabus) → OfferingEnrollment`, `curriculum-design/logic/syllabus-offering.resolver.js`) a grano Offering/término. `Section` no tiene vínculo a estudiante; su `numberStudents` es manual (`section-create.resolver.js:133`); ningún seed crea `OfferingEnrollment`.
- **Cambios técnicos**: ninguno (spike de decisión). Las tres opciones a evaluar: grano curso/término (reusa lo existente), grano paralelo con Offering bajando de grano (agrega `sectionId`/`sectionClusterId` a Offering), o `SectionEnrollment` nuevo.
- **Criterios de aceptación**: decisión registrada con la opción elegida y su impacto de esquema/seed.
- **Test cases**: n/a (spike).
- **Dependencias**: blocked by Épica 2 (existe el cluster).
- **Riesgo / rollback**: no implementa; habilita los tickets de implementación (3B…), que se definen según la opción elegida.
- **DoD**: decisión documentada; no aplica DoD de esquema.

---

## Mapa de dependencias (resumen)

```
Épica 1:  1A → 1B → 1C-a → 1C-b
                 1B → 1D (con 1C-b)
                 1B → 1E-a → 1E-b (con 1A)
                 1E-a → 1C-b (backfill)

Épica 2 (tras Épica 1):  2A
                          2A → 2B-a → 2B-b
                          2B-a → 2C
                          2A, 2B-a → 2D
                          2A → 2E-a → 2E-b (con 2B-a/2B-b/2C), 2E-c (con 2B-a)

Épica 3 (tras Épica 2):  3A → (3B… según decisión)
```
