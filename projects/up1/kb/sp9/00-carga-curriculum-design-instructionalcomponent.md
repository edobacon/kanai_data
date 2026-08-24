# SP9 - Carga de Curriculum Design: Instructional Component (ticket unico)

> Planning-data de SP9 (migracion uAssessment). Registra la **carga de
> curriculum-design** acordada en la planificacion del 2026-08-13/14, concentrada
> en **un solo ticket** tal como quedara especificada en el sprint. No es un
> record DKC (no pasa por learn->promote): es material de planificacion consultable
> por ruta.

## Fuentes

- Refinamiento 2026-08-13: `transcripts/2026-08-13-refinamiento-sprint-uassessment.md`
- Sprint Planning 2026-08-14: `transcripts/2026-08-14-sprint-planning-sp9-uassessment.md`
- Analisis previo (SP8): `kb/sp8/00-registro-analisis-instructionalcomponent.md`
- Artifact "Plan de tickets - InstructionalComponent" (3 epicas / 16 tickets):
  https://claude.ai/code/artifact/b77e0954-9666-496a-a464-ef9589217249

## Decision de estructura

El artifact desagrega el trabajo en 3 epicas por mod (16 tickets). En la
planificacion (transcript 08-13, ~00:42:58) Eduardo lo dimensiono como epica de
**~13 puntos / ~7 tickets** para curriculum-design, y planteo la alternativa de
**un unico ticket grande con las tareas dentro**. Para SP9 se toma esa alternativa:
la carga de curriculum-design va como **un solo ticket** que reencapsula la Epica 1
del artifact; las 7 piezas quedan como **sub-tareas internas** (checklist), no como
tickets separados.

Las Epicas 2 (academic-scheduling) y 3 (uengagement, spike de grano de matricula)
**no** son carga de curriculum-design; quedan fuera de este ticket y las coordinan
sus equipos (ver dependencias). Curriculum Design las **desbloquea**.

---

## TICKET UNICO - Implementacion de Instructional Component (Curriculum Design)

| Campo | Valor |
|-------|-------|
| Mod | curriculum-design |
| Sprint | SP9 (migracion uAssessment, sprint 9 de 17) |
| Estimacion | ~13 puntos / ~1 semana (3-4 dias si no hay sorpresas, transcript 08-13 ~00:44:10 y ~00:45:34) |
| Esfuerzo | Considerable (7 sub-tareas, mayoria aditivas y operativas: objetos, seeds, pruebas) |
| Sensibilidad | **Alta**, concentrada en la sub-tarea 4 (drop destructivo de columnas de Modality): requiere consentimiento por tenant + coordinacion con core |
| Dueño | Eduardo Bacon |

### Objetivo

El curso pasa a declarar sus **piezas de dictado** (catedra / laboratorio / taller,
etc.) con sus horas, y la **modalidad deriva su carga** de esas piezas. Resultado:
un curso creado desde el formulario de Curriculum Design tiene modalidades con
piezas, y las horas ya no se digitan en la modalidad. Modela `instructional
component` como extension del concepto legacy curso-actividad, desbloqueando la
unificacion assessment/planning.

### Sub-tareas (checklist interno, del artifact Epica 1)

- [ ] **1A - Catalogo InstructionalComponentType** _(esfuerzo Menor / sensibilidad Baja)_
  Objeto base con catalogo de tipos de pieza (Catedra, Practica, Laboratorio,
  Taller, Seminario, Ayudantia, Clinica, Terreno). Patron de `ResourceTypes`.
  Seed idempotente por `name`. **Aditivo.** Sin dependencias (arranca).

- [ ] **1B - Objeto InstructionalComponent (RecordType)** _(Considerable / Baja)_
  RecordType de `CurricularSection` (`rt__InstructionalComponent__curricularsection`),
  hijo de la modalidad por `parentId`. Campos: `componentTypeId` (FK escalar),
  `hoursPerWeek`, `plannedGroupSize`, `requiredInstructorCount`, `deliveryLocation`,
  `synchronicity`, `isPrimary`, `requiresOwnSection`. Reusa arbol, record-list
  embebido, associated layouts y `deepClone`. **Aditivo.** Blocked by 1A.

- [ ] **1C-a - Derivacion de horas de la modalidad** _(Considerable / Baja)_
  Total de horas de la modalidad = suma de `hoursPerWeek` de sus piezas hijas
  (resolver de lectura o campo computado del layout). Las 4 columnas de horas
  siguen existiendo (convivencia). **Aditivo.** Blocked by 1B.

- [ ] **1C-b - Drop de columnas de horas de Modality + migracion** _(Menor / **Alta**)_
  Retira `theoryHours/practiceHours/labHours/autonomousHours` del JSON de
  `rt__Modality__curricularsection`. **Corregido el 2026-08-17, dos veces:**
  (a) **sin backfill**, porque en up1 no hay dato productivo, todo el dato es de prueba;
  (b) **codegen + sync NO eliminan las 4 columnas**: el merge es append-only y el
  RecordType publicado en `object-manager/objects/business/` las conserva, con las
  columnas vivas en los **18** schemas de tenant. El retiro efectivo es un cambio
  commiteado en el repo de core (precedentes UPONE-1623 y UPONE-1523) y se recomienda
  dentro de este mismo ticket como sub-tarea **1C-c**, medida en
  `sp9/UPONE-1619-publicacion-en-core.md`.
  Guard de `isDefault` intacto. Se mantiene separado de 1C-a por **sensibilidad**, no
  por esfuerzo. Blocked by 1C-a.

- [ ] **1C-c - Publicacion en core del modelo nuevo y del retiro** _(Menor / **Alta**)_
  Publicar el catalogo y el RecordType nuevos en `object-manager/objects/business/`,
  retirar ahi las 4 claves de horas por el procedimiento del precedente (borrar el
  mergeado, regenerar con `sync:files`, **commitear**), regenerar los **18**
  `prisma/<TENANT>/schema.prisma` y los typeDefs, y aplicar la migracion por tenant.
  Verificar que una corrida posterior de sync **no revierte** el retiro. Commits en
  `object-manager` con el id de este ticket, como hizo UPONE-1523 con el suyo.
  **Va dentro del ticket** (decision 2026-08-17): es la misma implementacion aunque
  viva en otro repo, y sacarla reproduciria el fallo que UPONE-1623 vino a reparar.
  Blocked by 1C-b.

- [ ] **1D - Formulario del curso con piezas anidadas** _(Considerable / Media)_
  En `default_Activity_edit` (tabbed), el sub-layout de cada modalidad incorpora un
  record-list anidado de InstructionalComponent (filtrado por `parentId`). Quitar
  inputs de horas de Modality y mostrar total derivado. Reapuntar
  `default_Offering_syllabus_{view,edit}` que leen las keys de horas. Riesgo
  conocido: el RecordList filtra columnas a campos reales; **verificar render real,
  no solo config**. Blocked by 1B, 1C-b.

- [ ] **1E-a - Extender el loader del seed para parentId** _(Considerable / Media)_
  El loader de silabo (`_data-syllabus-sections.js`) resuelve el id de la modalidad
  y setea `parentId` en los registros de tipo pieza. Cambio de capacidad del loader.
  Acotar la resolucion al caso pieza para no afectar otros RT. Blocked by 1B.

- [ ] **1E-b - Reescribir datos del seed de silabo + tests de conteo** _(Menor / Baja)_
  Quitar horas de cada registro Modality y agregar piezas hijas con `parentId`
  (ej. Presencial gana "Catedra" 4h y "Practica" 2h). Actualizar
  `seed-counts.test.ts` y `seed-counts.md`. Re-seed idempotente. Blocked by 1A, 1B, 1E-a.

### Orden interno sugerido

`1A -> 1B -> 1C-a -> 1E-a -> 1E-b -> 1D -> 1C-b -> 1C-c`

(1C-b y 1C-c al final: el drop destructivo se despliega sobre una derivacion ya viva y
verificada, y la publicacion en core cierra el tren, porque es la que hace efectivo el
retiro en la plataforma.)

### Definition of Done (compartido, del artifact)

- JSON del objeto + codegen sin errores.
- `prisma migrate` aplicado (aditivo); si es destructivo, consentimiento por tenant.
- Seeds actualizados y corriendo verde.
- Tests de conteo/integracion actualizados y verdes.
- `npm run sync` sin drift; `drift:check` verde.
- Layouts renderizan en smoke real, no solo config.
- Capabilities/RBAC definidas para objetos nuevos.
- i18n de labels nuevos.
- lint/typecheck verdes; sin `console.*` en prod.
- PR revisado.
- **MCP**: dado el acuerdo de SP9, la sincronizacion con el MCP es parte de la
  misma historia (desarrollar y probar en UP1, luego sincronizar MCP, agregar tests
  MCP y cumplir protocolos MCP).

### Pendiente declarado hacia academic-scheduling (2026-08-17)

Su **ticket 2C (herencia de tipos de recurso)** depende de que la pieza declare que recursos requiere.
Ese campo **no esta en el alcance de ningun ticket** y **no lo cubre este**: curriculum-design no consume
ese dato ni tiene su especificacion, y academic-scheduling **puede declararlo desde su propio mod** (el
sync une los campos que varios mods declaran sobre el mismo objeto, como ya ocurre con `Offering`). Si
ademas necesitan captura por pantalla, ese input es de curriculum-design y es un cambio menor y aditivo.

Analisis completo, evidencia, alternativas descartadas y la pregunta redactada para ese equipo:
`sp9/UPONE-1619-tipos-de-recurso-frontera-cd-as.md`.

### Dependencias que este ticket desbloquea (fuera de la carga de CD)

- **Epica 2 - academic-scheduling** (8 tickets: SectionCluster, FKs de pieza/cluster
  en Section, derivacion de cupo/modulos, herencia de tipos de recurso, algoritmo
  id_parent, seeds). La coordina el equipo de Scheduling.
- **Epica 3 - uengagement** (spike 3A: decision de grano de matricula
  `SectionCluster -> Offering`). Punto **abierto**, lo decide Engagement sobre la
  evidencia del modelo.

### Riesgo principal (reformulado el 2026-08-17)

Sub-tarea 1C-b (drop de columnas de horas de Modality) sigue siendo el unico punto
**destructivo** y de **sensibilidad alta**, pero por otro motivo del que se creia.

- **Ya no es perdida de dato.** En up1 no hay dato productivo: todo el dato existente
  es de prueba, aunque se parezca al de un cliente real. El backfill deja de ser una
  red de proteccion.
- **Es riesgo de propagacion.** El merge del sync es **append-only** y nunca quita un
  campo que el mod deja de declarar. Sacar las 4 claves del JSON del mod no las saca
  de la plataforma: el RecordType publicado en `object-manager/objects/business/` las
  conserva y siguen vivas en los **18** `prisma/<TENANT>/schema.prisma`. El retiro real
  exige intervenir el mergeado en core y **commitearlo**; si queda sin commitear, la
  proxima corrida lo revierte (modo de falla documentado en el commit de UPONE-1523).

Rollback = restaurar el JSON y regenerar. Medicion completa del lado core, con el
borrador del ticket a abrir: `sp9/UPONE-1619-publicacion-en-core.md`.
