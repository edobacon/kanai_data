---
id: DOC-kb-sp8-instructional-component-plan-implementacion
project: up1
type: doc
---

# InstructionalComponent: plan de implementación técnico

> Plan de re-implementación del modelo de dictado de un curso en up1. Documento técnico: cada cambio indica qué se modifica y qué significa a nivel de esquema, codegen, migración, resolvers, layouts y seeds.
>
> Alcance: mods `curriculum-design` y `academic-scheduling` con cambios detallados. El tramo de `uengagement` queda como punto abierto para que ese equipo defina el modelo de matrícula (sección 6).
>
> Plataforma de referencia: `uplanner/up1`. Fecha: 2026-08-12.

---

## 1. Resumen del esquema

Hoy un curso declara su carga como un bloque plano dentro de la modalidad. El nuevo modelo descompone la modalidad en **piezas de dictado** (cátedra, laboratorio, taller), cada una con sus horas, tamaño de grupo, docentes y tipos de recurso, y ancla la planificación a esas piezas.

```
Activity (Course)                         [curriculum-design]
  └─ Modality                             contenedor; sus horas se derivan de las piezas
       └─ InstructionalComponent          NUEVA: la pieza de dictado
            componentTypeId  → catálogo   (cátedra / práctica / laboratorio / taller …)
            hoursPerWeek, plannedGroupSize
            requiredInstructorCount
            deliveryLocation, synchronicity
            isPrimary, requiresOwnSection
            requiredResourceTypes          lista de tipos de recurso requeridos

Section                                    [academic-scheduling]
  instructionalComponentId → la pieza      NUEVA FK: la sección planifica una pieza concreta
  sectionClusterId         → el combo      NUEVA FK
  capacity, weeklyModules                  derivados de la pieza
  (SectionResourceType, N:M ya existente)  heredado de la lista de la pieza

SectionCluster                             NUEVA: el "combo" válido (una sección por pieza)
  modalityId, termId, code                 alimenta id_parent/id_master_section del algoritmo

Offering / OfferingEnrollment              [uengagement]  → PUNTO ABIERTO (sección 6)
```

Regla del modelo: **el detalle del curso vive solo en curriculum-design**; hacia scheduling solo viajan identificadores (`instructionalComponentId`, `sectionClusterId`), nunca el detalle.

---

## 2. Contexto técnico

- up1 es **schema-driven**: los objetos son JSON, `npm run codegen` genera `prisma/schema.prisma` y los typeDefs de GraphQL, y `prisma migrate` aplica el cambio de esquema. Reformular un objeto es reescribir su JSON y regenerar.
- El detalle del curso se captura en un formulario **tabbed** en curriculum-design (`default_Activity_edit`), donde cada RecordType de `CurricularSection` (Modality, Content, Session, …) es un tab con un `record-list` embebido anidado por `parentId`. `InstructionalComponent` encaja en ese patrón como un nivel más profundo (pieza hija de la modalidad).
- `Section` (academic-scheduling) ya referencia `CurricularSection` de forma cross-mod vía `Section.modalityId` (FK escalar, recordType validado a nivel de aplicación). La pieza se referencia igual.
- Los seeds son la **representación viva del modelo**: se ejecutan en el sync y hay tests de integración que asertan sus conteos por objeto y recordType. El esquema, el seed y esos tests son un solo bloque coherente: un cambio de esquema sin su seed deja al mod con datos inválidos respecto de su propio modelo y con tests rojos.
- Un pase que toca `Section`/`Modality`/`Offering` dispara `codegen` + `sync` (10 fases) + `migrate` por tenant. No es quirúrgico: el sync regenera el modelo completo. Se planifica como un solo tren de core.
- **Dato ya presente**: el algoritmo de asignación declara `id_parent`, `id_master_section`, `STRICT_PARENT_ASSIGNMENT`, `PARENT_SAME_CLASSROOM`, `PARENT_SAME_TEACHER` (`academic-scheduling/seed/config-rule-definitions.js:74-80`). El motor ya espera un concepto de sección-padre; `SectionCluster` le da entidad de datos.

---

## 3. Secuencia de implementación

La re-implementación avanza **mod por mod**, en tres fases. Cada fase entrega, como una sola unidad coherente, el cambio de objetos, sus layouts, sus seeds y sus tests: una fase no se cierra hasta que esquema, datos sembrados y tests son consistentes entre sí y corren verde. Al terminar cada fase el sistema queda funcional.

**Fase 1 · curriculum-design.** Va primero porque es el dueño del detalle y la fuente de las piezas. Mientras `InstructionalComponent` no exista, no hay nada que scheduling pueda referenciar. Esta fase crea la pieza y el catálogo, reformula la modalidad para que derive sus horas, ajusta el formulario del curso y reescribe el seed del sílabo (las horas dejan de vivir en la modalidad y pasan a las piezas). Deja el curso funcional con piezas, sin tocar la planificación.

**Fase 2 · academic-scheduling.** Va después porque **consume** lo que la Fase 1 produce: la sección se ancla a una pieza y a un cluster, y el cupo se deriva de la pieza. No tiene sentido antes de que la pieza exista. Esta fase crea `SectionCluster`, agrega las FK en `Section`, conecta el cluster al algoritmo (que ya lo espera) y reescribe los seeds de sección. Deja la planificación anclada a piezas.

**Fase 3 · uengagement.** Va al final por dos razones: depende de que exista la planificación (el cluster) y depende de una **definición de negocio** que el código no puede tomar (el grano de matrícula del curso). Hasta cerrar esa definición no se toca. Los cambios de las Fases 1 y 2 no dependen de ella y pueden avanzar antes.

Por qué esquema, seed y tests se mueven juntos en cada fase: up1 es schema-driven y el seed materializa el modelo; los tests de integración asertan sus conteos. Si un mod cambiara su esquema y dejara el seed para después, quedaría publicando un modelo nuevo con datos que no le corresponden y con su suite en rojo. Por eso el seed y sus tests son parte del entregable de la misma fase, no un paso posterior.

---

## 4. Fase 1 · curriculum-design: reformular el detalle de dictado

### 4.1 Objeto nuevo: catálogo de tipos de componente

**Qué cambia**: se crea `InstructionalComponentType`, catálogo de nombres de pieza (Cátedra, Práctica, Laboratorio, Taller, Seminario, Ayudantía, Clínica, Terreno).

**Significado técnico**:
- Nuevo objeto base JSON en `curriculum-design/objects/`. Campos: `name` (unique), `code`, `priority` opcional. Mismo patrón que `ResourceTypes` de scheduling.
- `codegen` genera la tabla Prisma y el tipo GraphQL. `migrate` crea la tabla (aditivo, no destructivo).

### 4.2 Objeto nuevo: la pieza de dictado

**Qué cambia**: se crea `InstructionalComponent` como **RecordType de `CurricularSection`** (`rt__InstructionalComponent__curricularsection`), hija del nodo `Modality` vía `parentId`.

**Por qué RecordType de CurricularSection** (y no objeto suelto): `CurricularSection` ya es el árbol polimórfico del sílabo (`ownerType`/`ownerId` + `parentId` composite). Modelar la pieza como RT reusa el árbol, el `record-list` embebido, los associated layouts y el `deepClone` de subárboles que CD ya tiene. Un objeto suelto obligaría a construir todo ese andamiaje de cero.

**Significado técnico**:
- Nuevo JSON `curriculum-design/objects/RecordTypes/rt__InstructionalComponent__curricularsection.json`. Campos propios: `componentTypeId` (FK a `InstructionalComponentType`), `hoursPerWeek`, `plannedGroupSize`, `requiredInstructorCount`, `deliveryLocation`, `synchronicity`, `isPrimary`, `requiresOwnSection`. Hereda de CurricularSection: `name`, `position`, `ownerType`, `ownerId`, `parentId`, `recordType`.
- Debe registrarse en la lista de RecordTypes declarados del mod (el test `recordtypes-declared.test.ts` valida el set).
- `codegen`/`migrate`: la proyección RT vive en la tabla de CurricularSection con su discriminador; el FK `componentTypeId` es un id escalar (patrón RT de up1: los FK de RT no son relaciones Prisma).
- Anidamiento: la pieza cuelga del nodo `Modality` por `parentId` (la Modalidad es a su vez un `CurricularSection` hijo de la Activity). El `record-list` embebido filtra `parentId = {{modalityId}}`, `recordType = InstructionalComponent`.

### 4.3 Lista de tipos de recurso por pieza

**Qué cambia**: la pieza declara `requiredResourceTypes` (0..N tipos de recurso que necesita).

**Significado técnico**:
- El catálogo real de tipos de recurso (`ResourceTypes`) vive en **academic-scheduling**, no en CD. Dos formas de resolver la relación cross-mod:
  - (A) La pieza guarda la lista como referencia lógica (ids/códigos de ResourceTypes) y **la materialización a la relación N:M ocurre en scheduling** al crear la Section (crea filas en el `SectionResourceType` ya existente). CD no gana un objeto N:M nuevo; solo persiste la intención.
  - (B) Se crea un objeto puente en CD (`InstructionalComponentResourceType`) que referencia el catálogo cross-mod. Más explícito, pero introduce un N:M cross-mod que hoy no existe.
- Recomendado (A) por menor acoplamiento: la fuente de verdad del catálogo queda en scheduling y CD solo declara la necesidad. El `SectionResourceType` (N:M `Section`↔`ResourceTypes`) ya existe y se reusa, no se crea nada nuevo del lado consumo.

### 4.4 Reformular Modality

**Qué cambia**: `Modality` deja de digitar `theoryHours/practiceHours/labHours/autonomousHours`. Pasa a ser contenedor; sus horas se derivan sumando las de sus piezas. Conserva `code`, `isDefault`, `deliveryMode`.

**Significado técnico**:
- Se editan las properties de `rt__Modality__curricularsection.json` quitando los 4 campos de horas.
- `codegen` regenera; `migrate` **elimina 4 columnas** de la tabla de CurricularSection: cambio **destructivo** a nivel BD (requiere consentimiento por tenant, ver sección 8).
- Las horas derivadas de la modalidad no requieren columna: se calculan en el resolver de lectura o en un campo computado del layout a partir de las piezas hijas. No hay consumidor server de esas horas hoy (el único código que toca el RT es el guard de `isDefault` en `curriculum-design/logic/helpers/modalityDefault.js:37-59`, que no lee horas y queda intacto). El passthrough `id_modality` del algoritmo (`scheduling-inputs.resolver.js:376`) usa solo el id de la modalidad, no sus horas.

### 4.5 Formularios (layouts)

**Qué cambia**: el tab "Modalidades" del curso deja de mostrar horas planas y muestra la lista de piezas de cada modalidad; se agregan los layouts de la pieza y del catálogo.

**Significado técnico**:
- `default_Activity_edit.json`: en el bloque de modalidades, el sub-layout de cada modalidad incorpora un `record-list` anidado de `InstructionalComponent` (filtrado por `parentId` de la modalidad), con `canCreateLayoutId` a los layouts nuevos.
- Nuevos `default_rt__InstructionalComponent__curricularsection_{create,edit,view}.json` y `default_InstructionalComponentType_{create,edit,view,list}.json`.
- Ajustar `default_rt__Modality__curricularsection_{create,edit,view}.json` para quitar los inputs de horas y mostrar el total derivado.
- Reapuntar los layouts de sílabo que hoy leen las keys de horas de Modality (`default_Offering_syllabus_{view,edit}.json`).
- `Content` y `Session` se mantienen como están (ejes distintos: temario y calendario). No se pliegan en este alcance.

### 4.6 Seeds y tests

- **`_data-syllabus-sections.js`** (reescritura mayor): quitar los 4 campos de horas de cada registro Modality (líneas 10-20, hoy 11 registros) y agregar los registros hijos `InstructionalComponent` con `parentId` a su modalidad. Ejemplo `C-CALCULOI-001`: la modalidad "Presencial" gana piezas "Cátedra" (`hoursPerWeek: 4`) y "Práctica" (`hoursPerWeek: 2`), en vez de `theoryHours: 4, practiceHours: 2`. `Content` (55) y `Session` (176) no cambian.
- **Extender el loader** (líneas 387-417): hoy separa base vs satélite y ancla todo con `ownerType:'Activity', ownerId`, sin `parentId` (Modality/Content/Session son hermanos bajo la Activity). La pieza necesita colgar de la modalidad: agregar resolución del id de la modalidad por `(ownerActivityCode, recordType=Modality, code=PRES)` y setar `parentId` en la pieza. Es un cambio de capacidad del loader, no solo de datos.
- **Seed del catálogo**: `config-<componenttype>.js` (patrón de `config-resourcetypes.js`) que puebla `InstructionalComponentType`, idempotente por `name`. Corre antes de `_data-syllabus-sections.js` (las piezas lo referencian por `componentTypeId`).
- **Tests/doc de conteo**: `tests/integration/seed-counts.test.ts:451-459` aserta los 374 CurricularSection y el set de 7 recordTypes; cambia con el nuevo recordType y las N piezas por modalidad. Actualizar también `docs/reference/seed-counts.md:60`.

**Validación de la fase**: `codegen` + `migrate` verdes; seeds corridos verde y consistentes con el nuevo esquema (sembrar un curso desde cero produce piezas y la modalidad muestra horas derivadas); tests de conteo actualizados en verde; `sync`; smoke real del formulario (crear curso, modalidad, agregar piezas, ver horas derivadas); capabilities de los objetos nuevos.

---

## 5. Fase 2 · academic-scheduling: anclar la planificación a la pieza

### 5.1 Objeto nuevo: SectionCluster

**Qué cambia**: se crea `SectionCluster`, el combo válido de secciones (una por pieza de la modalidad).

**Significado técnico**:
- Nuevo objeto base JSON `academic-scheduling/objects/SectionCluster.json`. Campos: `modalityId` (FK cross-mod a CurricularSection recordType=Modality), `termId` (FK), `code`. Unique sugerido `[modalityId, termId, code]`.
- `codegen`/`migrate`: tabla nueva (aditivo).
- **Conexión con el algoritmo**: `SectionCluster` da soporte de datos a los parámetros ya existentes `id_parent` / `id_master_section` / `STRICT_PARENT_ASSIGNMENT` (config-rule-definitions.js:74-80). El resolver `scheduling-inputs.resolver.js` debe empezar a poblar `id_parent` (hoy no lo hace) desde `sectionClusterId`.

### 5.2 Reformular Section

**Qué cambia**: `Section` gana `instructionalComponentId` y `sectionClusterId`; `capacity` y `weeklyModules` pasan a derivarse de la pieza.

**Significado técnico**:
- Se editan las properties de `Section.json`: dos FK nuevos escalares.
  - `instructionalComponentId` → `CurricularSection` (recordType=InstructionalComponent), mismo patrón cross-mod que el `modalityId` ya presente (líneas 108-116).
  - `sectionClusterId` → `SectionCluster`.
- `codegen`/`migrate`: agrega 2 columnas nullable (aditivo, bajo riesgo). El unique existente `[activityId, termId, code]` se mantiene.
- **Derivación de cupo/módulos**: `plannedGroupSize` de la pieza alimenta `capacity`; `hoursPerWeek` alimenta `weeklyModules`. Dos caminos:
  - (A) mantener las columnas y poblarlas por el resolver de creación de Section a partir de la pieza (derivación en escritura, permite override manual).
  - (B) volverlas read-only calculadas en lectura.
  Recomendado (A): menos ruptura del algoritmo, que hoy lee `Section.weeklyModules` como `nm_week_modules`. El resolver de creación toma el valor de la pieza y lo persiste; el form lo muestra read-only con override opcional.
- El `requiredInstructors` de Section se alinea con `requiredInstructorCount` de la pieza por la misma vía.

### 5.3 Herencia de tipos de recurso

**Qué cambia**: la lista `requiredResourceTypes` de la pieza se materializa en las filas `SectionResourceType` de la sección.

**Significado técnico**:
- `SectionResourceType` (N:M `Section`↔`ResourceTypes`) ya existe; no se crea objeto nuevo.
- El resolver de creación de Section, al conocer la pieza, crea las filas `SectionResourceType` correspondientes a los tipos declarados por la pieza. Esto satisface el ajuste "recurso como lista contra catálogo" del lado consumo.

### 5.4 Algoritmo de asignación

**Qué cambia**: los parámetros de "parent" pasan de ser solo config a apoyarse en `SectionCluster` real.

**Significado técnico**:
- `scheduling-inputs.resolver.js` empieza a emitir `id_parent`/`id_master_section` desde `sectionClusterId` en el payload del algoritmo (hoy esos campos existen en `SORT_PARAMETERS_CLASSROOM_ASSIGNMENT` pero no se pueblan desde una entidad).
- Los flags `STRICT_PARENT_ASSIGNMENT`/`PARENT_SAME_CLASSROOM`/`PARENT_SAME_TEACHER` no cambian de forma; ganan semántica real al existir el cluster.

### 5.5 Formularios (layouts)

**Qué cambia**: `section-create` incorpora el select de pieza y el cluster; cupo/módulos se muestran derivados.

**Significado técnico**:
- `section-create.json`: agregar `instructionalComponentId` (select filtrado por la modalidad del curso elegido) y `sectionClusterId`. Mostrar `capacity`/`weeklyModules` como derivados (read-only u override).
- Layout de `SectionCluster` (create/list) para armar y visualizar el combo.
- Hoy `section-create` ni siquiera expone `modalityId` (existe en BD pero no en el form); conviene incorporarlo en el mismo pase para que la cadena modalidad → pieza sea coherente en la UI.

### 5.6 Seeds y tests

Dos seeds crean `Section` y ninguno setea `modalityId` hoy; ambos se reescriben con las nuevas FK:

- **`populate-sections.js`** (líneas 127-140): secciones demo (2 cursos × 2). Setear `instructionalComponentId` (una pieza de la modalidad del curso) y `sectionClusterId`; `capacity`/`weeklyModules` desde la pieza (`plannedGroupSize`/`hoursPerWeek`) en vez de constantes. Extender el backfill idempotente (`missingFields`) a los campos nuevos.
- **`populate-zzz-calendar-demo.js`** (líneas 360-377): crea **1000 Section** con el mismo shape; recibe los mismos cambios o quedará generando secciones sin pieza ni cluster (rompe el algoritmo, que ahora espera `id_parent`).
- **Seed de `SectionCluster`**: crear los clusters (uno por modalidad+término) antes de las secciones. Como `dbSync.js` no ordena los seeds (itera `fs.readdir` sin `.sort()`), usar un prefijo que ordene antes (ej. `populate-0-...`), no confiar en el orden implícito.
- **`SectionResourceType`**: materializar las filas N:M desde la lista de la pieza al crear cada sección demo. Revisar coherencia con `populate-resources.js`, que hoy siembra `ResourceTypeAssignment` (Resource↔tipos), para no dejar catálogos cruzados inconsistentes.
- **Sin cambios de datos**: `config-resourcetypes.js` (catálogo se mantiene) y `config-rule-definitions.js` (los parámetros de parent ya están sembrados; el cambio es que el resolver los pueble desde `SectionCluster`).
- **Tests**: revisar las suites de integración de scheduling que cuenten Sections o validen su shape.

**Validación de la fase**: `codegen`/`migrate` verdes; seeds corridos verde (los dos seeds de Section producen secciones con pieza + cluster; clusters creados antes; `SectionResourceType` materializado); `sync`; smoke por el path real de creación de Section (select de pieza, derivación de cupo); prueba del algoritmo con un cluster de dos piezas (teoría + lab) y `STRICT_PARENT_ASSIGNMENT=1`.

---

## 6. Fase 3 · uengagement: punto abierto (matrícula)

Los cambios de las Fases 1 y 2 no dependen de esta definición y pueden avanzar antes. Este tramo queda abierto para que el equipo de engagement decida el modelo de matrícula de cursos.

### 6.1 Estado actual (evidencia)

- Existe un camino de matrícula de **curso** ya construido: `Activity(Course) → Offering(recordType=Syllabus) → OfferingEnrollment` (`curriculum-design/logic/syllabus-offering.resolver.js`, espejo del de servicios). `Offering` fue extendido con `recordType`/`activityId`/`termId`/`lifecycleStatus`.
- Ese camino opera a grano **Offering/Término** (curso completo en un período). `Offering` no tiene `sectionId`; `Section` no tiene vínculo a estudiante; su `numberStudents` es **manual** (`section-create.resolver.js:133`), sin los flows de capacidad que sí tiene `Offering.usedCapacity` (movido por n8n: `flow-01-...`, `flow-03-...`).
- No existe `SectionEnrollment` ni resolver que conecte scheduling ↔ engagement para un estudiante.

### 6.2 La pregunta a decidir

> ¿La matrícula de un curso es al **curso en el período** (el paralelo/sección se resuelve después), o el estudiante se matricula en un **paralelo/Section específico** (con su combo teoría + lab)?

### 6.3 Opciones técnicas

| Opción | Qué implica técnicamente | Reuso |
|---|---|---|
| **Grano curso/término** | La matrícula sigue en `Offering(Syllabus)` + `OfferingEnrollment`. `SectionCluster` actúa como puente de reflejo Offering↔Section (relación de lectura, sin cambiar el grano de matrícula). | Máximo: objeto, resolver espejo y flows de cupo ya existen |
| **Grano paralelo (Offering baja)** | Se agrega `sectionId`/`sectionClusterId` a la `Offering(Syllabus)`; `OfferingEnrollment` y los flows n8n de capacidad se reusan al nuevo grano. Cambio de esquema en `Offering` + ajuste de resolvers de matrícula. | Alto: reusa enrollment y flows |
| **Grano paralelo (SectionEnrollment nuevo)** | Nuevo objeto `SectionEnrollment` (`[sectionId|sectionClusterId, studentId]`) + resolver de alta/baja + equivalente a FLOW-01/03 para sincronizar `numberStudents` (hoy manual). | Bajo: matrícula en el grano exacto, pero se construye la sincronización de cupo de cero |

### 6.4 Puntos de esquema y seed que la decisión toca

- `Offering`: posible nuevo FK a `Section`/`SectionCluster` (solo la opción 2).
- `Section.numberStudents`: hoy manual; en cualquier opción con matrícula a grano paralelo, pasa a derivarse de la matrícula (requiere gancho/flow).
- Modalidad de la oferta: `Offering.generalModality` y `Event.modality` son hoy display sin lógica; si se quiere que deriven de `rt__Modality`, es trabajo net-new de este tramo (opcional).
- Seeds: `curriculum-design/seed/_data-offerings.js` ya siembra 120 `Offering` `recordType='Syllabus'` + `ActivityLine` + `Term`; si el grano baja a paralelo, este seed agrega el vínculo a `Section`/`SectionCluster`. Los seeds de `uengagement-up1` (`_data-engagement.js`, `b-service-seeds.js`, `c-activityline-seeds.js`) solo se tocan si cambia el esquema de `Offering` o se agrega `SectionEnrollment`. Ningún seed crea `OfferingEnrollment` hoy (se genera por resolver/frontend).

**Nota de nombres**: `Section` (academic-scheduling, paralelo de horario) y `CurricularSection` (curriculum-design, sección del sílabo) son objetos distintos con nombre casi idéntico. Cualquier diseño de "vincular Section a Offering" debe explicitar cuál Section es.

---

## 7. Índice consolidado de seeds

Cada seed se actualiza dentro de la fase de su mod (detalle en 4.6 y 5.6). Esta tabla es el índice de todo lo tocado.

| Seed / test | Fase | Acción |
|---|---|---|
| `curriculum-design/_data-syllabus-sections.js` | 1 (4.6) | Reescritura mayor: horas Modality → piezas; extender loader para `parentId` |
| `curriculum-design/config-<componenttype>.js` | 1 (4.6) | Nuevo: catálogo `InstructionalComponentType`; corre antes que `_data-syllabus-sections.js` |
| `curriculum-design/tests/integration/seed-counts.test.ts` + `docs/reference/seed-counts.md` | 1 (4.6) | Actualizar conteos/recordTypes |
| `academic-scheduling/populate-sections.js` | 2 (5.6) | Reescritura: FK de pieza y cluster, cupo derivado, materializar `SectionResourceType`, backfill |
| `academic-scheduling/populate-zzz-calendar-demo.js` | 2 (5.6) | Reescritura: 1000 secciones con pieza + cluster |
| `academic-scheduling` seed nuevo de `SectionCluster` | 2 (5.6) | Nuevo: clusters por modalidad+término; prefijo que ordene antes de las secciones |
| `academic-scheduling/populate-resources.js` | 2 (5.6) | Revisar coherencia de `SectionResourceType` vs materialización desde la pieza |
| `academic-scheduling/config-resourcetypes.js` | 2 | Sin cambios (catálogo se mantiene) |
| `academic-scheduling/config-rule-definitions.js` | 2 | Sin cambios de datos (el cambio de `id_parent` es en resolver) |
| Tests de integración de scheduling que cuenten Sections | 2 (5.6) | Revisar (cambia el shape; el de calendario crea 1000) |
| `curriculum-design/_data-offerings.js`, `uengagement-up1/*` | 3 | Pendiente de la decisión de engagement (sección 6) |

---

## 8. Reversibilidad y riesgos

- **Reversibilidad de la forma**: barata (revertir JSON + regenerar).
- **Reversibilidad del dato**: el drop de las 4 columnas de horas de Modality (4.4) es **destructivo** a nivel BD; requiere consentimiento por tenant y, si hay dato productivo, un script de migración que traduzca las horas existentes a piezas antes del drop.
- **Migración de datos productivos**: por cada Modality existente con horas, generar sus piezas iniciales (script idempotente por tenant). Verificar volumen real de dato por tenant antes de ejecutar.
- **Relación cross-mod pieza → tipos de recurso**: el catálogo `ResourceTypes` vive en scheduling; se recomienda que la pieza declare la intención y que la materialización al N:M `SectionResourceType` ocurra en scheduling al crear la Section (evita un N:M cross-mod).
- **Pase de core coordinado**: ejecutar `codegen` + `sync` + `migrate` de los mods tocados en un solo tren para evitar drift entre tenants; correr `npm run drift:check` al cierre.
- **Colisión de nombres**: `Section` (academic-scheduling) y `CurricularSection` (curriculum-design) son objetos distintos de nombre casi idéntico; explicitar cuál en todo diseño que los cruce.
