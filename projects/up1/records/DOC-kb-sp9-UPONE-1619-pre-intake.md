---
id: DOC-kb-sp9-UPONE-1619-pre-intake
project: up1
type: doc
---

# UPONE-1619 - Pre-intake (guia de implementacion)

> Material del implementador. **No va a Jira.** Alimenta el intake de DKC: entrega el mapa de enfoques,
> las hipotesis a validar y los riesgos tecnicos, para que el intake genere y valide hipotesis en vez de
> investigar desde cero. Contrato del ticket: `UPONE-1619-detalle.md`.

## Veredicto y superficie

**Veredicto: feature nueva, mayoritariamente aditiva, con una sola pieza destructiva.** Nada del modelo
existe hoy, y esta confirmado por triple evidencia (busqueda vacia, ausencia de archivos, y constancia
fechada en el mod vecino). El riesgo esta concentrado en el retiro de las columnas de horas.

**Superficie estimada:** 2 objetos nuevos (catalogo y tipo de registro de la pieza), 1 seed de catalogo
nuevo, 3 o mas layouts nuevos del tipo de registro, 1 modificacion del layout de edicion de curso, 2
layouts de silabo a reapuntar, 1 modificacion del JSON del tipo de registro de modalidad, 1 extension del
loader del seed, datos del seed, 1 resolver o campo derivado, y sus tests. Es la carga grande del sprint.

## Contexto de negocio (por que importa, movido del detalle)

`InstructionalComponent` modela la pieza de dictado como extension del concepto legacy curso-actividad.
La propuesta original concilio tres visiones distintas (Curriculum Design, Smart Campus con su idea
descartada de "activity line", y Student Success/Engagement); ademas de resolver el modelo, resuelve un
problema de comunicacion entre verticales.

Los equipos vecinos ya avanzaron y estan esperando: la Epica 2 (academic-scheduling) arranco y quedo
detenida justo en la FK que depende de este ticket, lo que sube el costo de atrasarlo. Detalle tecnico
verificado de ese avance (Section, SectionCluster, commit que deja la FK diferida) en "CORRECCION 3 al
plan" mas abajo.

**No hay dato productivo en juego.** Todo el dato de up1 hoy es de prueba, aunque se parezca al de un
cliente real. El retiro de las horas no arriesga informacion de nadie, y el rescate previo deja de ser
una precondicion (ver H2 y "Efecto de las correcciones" mas abajo).

El hueco de agregacion del core (el motor de formulas no suma colecciones de hijos) y el caracter
append-only del merge del sync estan verificados con evidencia de codigo en las secciones "La brecha de
capacidad del core" y "Gotchas" de este documento; no se repiten aqui.

## Estado actual del codigo

Todo verificado contra el codigo de hoy. Las tres correcciones al plan previo estan marcadas.

**Lo que no existe:**
- No hay catalogo de tipos de pieza de dictado. Lo unico parecido es un campo de texto libre de tipo de
  componente en `rt__EvaluationComponent__curricularsection.json:17`, que es otra cosa (instrumentos de
  evaluacion).
- No existe `rt__InstructionalComponent__curricularsection.json` ni ninguna referencia al concepto en el
  codigo, salvo una mencion textual en las especificaciones de academic-scheduling
  (`mods/academic-scheduling/specs/UPONE-1523-nuevos-objetos-requeridos.md:294`) que declara su ausencia.

**El arbol donde se cuelga la pieza:**
- `mods/curriculum-design/objects/CurricularSection.json:31-49`: par dueno (`ownerType` con enum
  `Activity|Offering|Curriculum`, mas `ownerId` polimorfico sin FK declarada).
- `:73-81`: `parentId` como self-FK con referencia declarada.
- `:15-22`: metadata de hijos directos, recursiva por `parentId`.
- `:11-14`: indices por par dueno mas tipo de registro, y por `parentId`.
- **8 tipos de registro** existen hoy: bibliografia, contenido, seccion personalizada, componente de
  evaluacion, perfil de egreso, resultado de aprendizaje, modalidad y sesion. La pieza seria el noveno.
- Test que fija los tipos declarados: `tests/integration/recordtypes-declared.test.ts:23-32, 55-65`
  (8 de secciones + 2 de curriculo + 3 de requisitos = 13).

**Las columnas a retirar:**
- `objects/RecordTypes/rt__Modality__curricularsection.json`: `code` (`:11-17`), las cuatro de horas
  (`:18-41`), `isDefault` (`:42-48`), `deliveryMode` (`:49-55`).

**CORRECCION 1 al plan: el inventario de consumidores de las horas es mayor que "solo el guard".**
- El guard de modalidad por defecto (`logic/helpers/modalityDefault.js:37-59`) **no** lee horas: solo
  `isDefault`, par dueno y tipo de registro. Esa parte del plan es correcta.
- Pero las cuatro claves aparecen en los tres layouts propios del tipo de registro
  (`config/layouts/default_rt__Modality__curricularsection_{view,edit,create}.json`, por ejemplo
  `_view.json:41-81`).
- Y en `modsComponents/CompositeSectionTree/resolveFieldKind.ts:24-27`, que **nombra las cuatro por
  string** en un conjunto de heuristica de tipo de campo. Esto es codigo, no config.
- Y en el tipo GraphQL generado (`object-manager/src/graphql/typeDefs/dynamic.js:2593-2596`), que es
  salida de codegen y se regenera solo.
- **Ningun resolver de negocio las lee ni calcula con ellas**, que es el fondo de la afirmacion original.
- **Sub-correccion importante:** la copia de la heuristica en `layout/src/modsComponents/` es el
  **artefacto de sincronizacion** del componente del mod, no un archivo promovido al core. La fuente a
  editar es la del mod. No confundirse y editar la copia.

**CORRECCION 2 al plan: el passthrough del algoritmo esta en otra linea.**
`mods/academic-scheduling/logic/scheduling-inputs.resolver.js:468` (no `:376`), y solo usa el id de la
modalidad, no las horas. El contenido del plan era correcto, la referencia no.

**CORRECCION 3 al plan, y la mas relevante: el mod vecino ya avanzo.**
- `mods/academic-scheduling/objects/Section.json` ya tiene `activityId` (`:46-54`), `termId` (`:55-63`),
  `modalityId` (`:108-116`, agregado el 2026-08-07) y **`sectionClusterId` (`:131-139`, agregado el
  2026-08-13)**. El plan decia que no tenia el segundo.
- `mods/academic-scheduling/objects/SectionCluster.json` ya existe.
- El commit que los agrego (`e6bccc4`, 2026-08-13) dice explicitamente que la FK a la pieza queda
  **diferida hasta que el objeto exista**. Es la constancia de que este ticket es el bloqueante.
- `SectionResourceType.json` ya existe (N:M seccion a tipo de recurso, con unicidad compuesta).
- El catalogo de tipos de recurso que sirve de patron esta en
  **`mods/academic-scheduling/seed/config-resourcetypes.js`**, no en curriculum-design. Correccion de
  ubicacion.

**El seed:**
- `seed/_data-syllabus-sections.js`: el loader (`:389-417`) crea cada seccion **sin `parentId`** (cero
  ocurrencias en el archivo). Hoy todos los nodos nacen como raiz, sin jerarquia. Darle la capacidad de
  anidar es cambio de capacidad del loader.
- Tests y doc de conteos: `tests/integration/seed-counts.test.ts` y `docs/reference/seed-counts.md` (374
  filas en 7 tipos de registro activos por seed).

**Los layouts:**
- `config/layouts/default_Activity_edit.json:14` declara pestanas; la de modalidades (`:32`) tiene un
  **listado embebido** (no un sub-layout por modalidad) que muestra las columnas de horas de teoria
  (`:123`) y practica (`:124`) para todas las modalidades del curso.
- `default_Offering_syllabus_view.json:106-107` y `default_Offering_syllabus_edit.json:84-85` leen esas
  mismas dos claves.
- Ninguno de los tres muestra las otras dos claves de horas; esas solo viven en los layouts propios del
  tipo de registro.

**La brecha de capacidad del core, verificada:**
- El motor de formulas (`object-manager/src/services/formulaValidator.js:505-567`) arma su contexto con
  el dato del objeto mas datos relacionados **por FK hacia el padre**, y el recorrido de cadenas
  (`object-manager/src/services/auth/relationshipDiscovery.js:349-388`) solo camina FK escalares hacia
  arriba. **No agrega colecciones de hijos.**
- El listado no tiene fila de totales ni agregacion entre sus claves de configuracion
  (`layout/docs/reference/record-list-config-keys.md:36-38`).
- Conclusion: derivar la suma no es configuracion. Es un resolver del mod o un campo calculado en la capa
  de lectura.
- **Precision de la pasada de Aduana (ver seccion "Frontera core/mod" mas abajo):** esta brecha es real
  pero no se escala en este ticket; se resuelve con resolver propio del mod y queda como decision abierta
  si el equipo quiere proponerla como extension de core mas adelante.

## Frontera core/mod (Aduana)

Pasada de Aduana en subagente con contexto limpio, modo analisis, sobre los 7 artefactos del alcance.

| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| Catalogo de tipos de pieza + su carga | `mod-only` | Sigue el patron de un catalogo de tipos que ya vive dentro de un mod, no en objetos Base | `mods/academic-scheduling/objects/ResourceTypes.json:1-29` |
| Pieza como RecordType anidado (FK escalar al tipo, `parentId` a la modalidad) | `mod-only` | El self-FK y el patron de FK escalar ya son mecanismo generico del objeto Base; el mod solo declara un RecordType satelite mas | `mods/curriculum-design/objects/CurricularSection.json:73-81`; `objects/RecordTypes/rt__EvaluationComponent__curricularsection.json:1-9` |
| Derivacion del total de horas desde las piezas hijas | `mod-only`, con brecha de core detectada | El motor de formulas del core solo camina FK hacia el padre y el listado no tiene fila de totales, pero la suma se resuelve con un resolver propio del mod sin tocar archivos compartidos | `object-manager/src/services/formulaValidator.js:505-567`; `object-manager/src/services/auth/relationshipDiscovery.js:349-388`; `layout/docs/reference/record-list-config-keys.md:36-38` |
| Retiro de las columnas de horas + migracion (destructivo) | `mod-only` | Cambio de esquema dentro de un RecordType propio del mod, por el pipeline generico de codegen y migracion; el riesgo es de proceso y coordinacion, no de genericidad | `mods/curriculum-design/objects/RecordTypes/rt__Modality__curricularsection.json:18-41` |
| Listado anidado de piezas en el formulario de curso + reapuntar layouts de silabo | `mod-only` | El listado embebido con filtro por el padre ya es mecanismo generico y ya esta en uso en el mismo mod un nivel mas arriba; anidar un nivel mas es configuracion | `mods/curriculum-design/config/layouts/default_Activity_edit.json:113-149`; `layout/docs/features/recordlist.md:540, 604` |
| Capacidad del loader del seed para anidar por `parentId` | `mod-only` | El loader es un script propio del mod sin enganche a core | `mods/curriculum-design/seed/_data-syllabus-sections.js:389-418` |
| Datos del seed y tests de conteo | `mod-only` | Datos y tests viven enteramente en el mod | `mods/curriculum-design/seed/_data-syllabus-sections.js:10-20` |

**Veredicto global: `todo-mod-only`.** Se ejecuta dentro del mod, sin coordinacion con core por
frontera. Los 7 artefactos se resuelven con mecanismos que el core ya expone.

Dos precisiones que la pasada dejo anotadas y no cambian el veredicto:

- **La brecha de agregacion es real pero no se escala aqui.** No existe en el core una capacidad
  generica de "campo derivado de una coleccion de hijos" ni fila de totales en el listado. Otros mods
  podrian quererla. Para este ticket se resuelve con resolver propio del mod; queda como Decision
  abierta por si el equipo quiere proponerla como extension de core mas adelante.
- **La copia de la heuristica de tipo de campo en el workspace de layout es un artefacto de
  sincronizacion, no codigo de core.** Los componentes del mod se sincronizan a `modsComponents/` de
  layout y de suite, y esos archivos no se editan a mano: se edita el del mod y se corre el sync. La
  fuente a modificar es la del mod.

## Efecto de las correcciones del 2026-08-17 en la estimacion (movido del detalle)

El rescate del dato deja de pesar en el esfuerzo (no hay dato productivo, ver "Contexto de negocio" y
decision resuelta abajo), y el tramo de core (RecordType publicado, 18 schemas, migracion) **se queda
dentro** del ticket, como sub-tarea 1C-c, en vez de derivarse a un ticket aparte. Los 13 SP del detalle
absorben ese tramo: 1C-b ya estaba estimada como esfuerzo menor con sensibilidad alta, y 1C-c es mecanica
con dos precedentes que la documentan (`fbdcfcb6` UPONE-1623, `00b35fb1` UPONE-1523). Si al ejecutarla
resulta mas cara de lo previsto, sube la estimacion del ticket; no se parte en otro ticket.

## Analisis de enfoques (posibilidades)

### Sobre la derivacion del total de horas

**Opcion A1 - Resolver de lectura del mod (recomendada).** Un resolver propio que calcule el total
sumando las horas de las piezas hijas.
- **Pros:** el dato viaja resuelto; no depende de capacidades del listado; testeable en aislamiento.
- **Contras:** hay que definir donde se expone el campo para que los layouts lo puedan pintar, y ahi
  aparece el riesgo de que el listado filtre columnas a campos reales del objeto.
- **Esfuerzo:** medio. **Reversibilidad:** alta.

**Opcion A2 - Campo calculado del layout.** Declararlo como derivado en la config.
- **Contras:** verificado que el motor no agrega colecciones de hijos. **Probablemente no viable**; hay
  que confirmarlo antes de invertir (ver H3).

**Opcion A3 - Persistir el total en la modalidad y mantenerlo al escribir piezas.**
- **Pros:** el listado lo pinta como cualquier columna real, sin riesgo de filtrado.
- **Contras:** dato derivado persistido es dato que se desincroniza. Va contra el objetivo del ticket, que
  es dejar de digitar horas. **No recomendada** salvo que A1 choque con el filtrado de columnas.

### Sobre el retiro de las columnas de horas

**Opcion B1 - Retiro al final, sobre derivacion ya viva (recomendada).** Es el orden que propone el plan.
- **Pros:** se despliega lo destructivo sobre algo ya probado; si la derivacion falla, no se perdio dato.
- **Contras:** ninguno relevante. Es el orden correcto.

**Opcion B2 - Retiro temprano para evitar convivencia.**
- **Contras:** deja al mod sin horas y sin derivacion probada en el intervalo. **No recomendada.**

**Opcion B3 - No retirar en este ticket.** Dejar las columnas y solo agregar la derivacion.
- **Pros:** elimina toda la sensibilidad del ticket; entrega la capacidad nueva sin riesgo.
- **Contras:** deja deuda y dos fuentes de verdad para las horas; el objetivo del PO es que las horas ya
  no se digiten.
- **Cuando tiene sentido:** si el consentimiento por tenant o la coordinacion con core no llegan a
  tiempo. **Vale registrarla como plan de contingencia**, porque permite cerrar el resto del ticket.

### Sobre el seed

**Opcion C1 - Extender el loader para resolver el padre solo en el caso de la pieza (recomendada).**
Acotar el cambio al tipo de registro nuevo para no alterar como nacen los otros ocho.
- **Pros:** riesgo contenido; los otros tipos de registro siguen igual.
- **Contras:** el loader queda con un caso especial.

**Opcion C2 - Generalizar el loader para resolver jerarquia de cualquier tipo.**
- **Pros:** mas limpio conceptualmente. **Contras:** toca como nacen los ocho tipos existentes y sus
  conteos. Mucho mas riesgo por el mismo valor entregado en este ticket.

## Consideraciones de implementacion

- **Orden sugerido (del plan, validado):** catalogo, pieza, derivacion, loader, datos del seed,
  formulario, y **retiro al final**. El retiro depende del rescate de datos, que depende del loader.
- **El rescate de datos dejo de ser precondicion (2026-08-17).** En up1 no hay dato productivo: todo el
  dato es de prueba. Reescribir el seed con piezas sigue en el alcance, pero como coherencia del ejemplo,
  no como red para no perder informacion.
- **Gotcha de sync no quirurgico:** en up1 el codegen y el sync regeneran el modelo de **todos** los mods.
  Un retiro no se aisla por mod. Requiere ventana de coordinacion con core antes de aplicar.
- **Gotcha mayor, y es el que redefine el gate: el merge del sync es append-only.** Nunca quita un campo
  que el mod deja de declarar. Sacar las cuatro claves del JSON del mod **no las saca de la plataforma**:
  el RecordType publicado en `object-manager/objects/business/RecordTypes/` las conserva, el codegen las
  sigue emitiendo y siguen vivas en los **18** `prisma/<TENANT>/schema.prisma`. Para retirarlas de verdad
  hay que intervenir el archivo mergeado en core y **commitearlo**; si queda sin commitear, la proxima
  corrida lo revierte. Dos precedentes: `fbdcfcb6` (UPONE-1623, planEntry) y `00b35fb1` (UPONE-1523,
  scheduling). **Ese tramo es de este ticket** (sub-tarea 1C-c), no de otro: los commits en
  `object-manager` van con el id de este ticket, igual que hizo UPONE-1523 con el suyo. Medicion y
  procedimiento: `sp9/UPONE-1619-publicacion-en-core.md`.
- **Gotcha de columnas del listado:** el listado filtra sus columnas a campos reales del objeto. Un total
  derivado declarado en config puede simplemente no aparecer. **Verificar el render real, no la config.**
  Este gotcha ya mordio antes en el mod.
- **Gotcha de la heuristica de tipo de campo:** al retirar las claves de horas, el conjunto que las nombra
  por string queda con referencias muertas. Editar **la fuente del mod**, no la copia sincronizada en el
  workspace de layout.
- **Gotcha de FK en tipos de registro:** la FK al tipo de pieza es id escalar, no relacion; no va en las
  inclusiones de la consulta.
- **Gotcha de conteos del seed:** agregar piezas cambia los conteos. El test y la doc de conteos se
  actualizan en el mismo cambio. Y **UPONE-1541 tambien toca el seed**: coordinar orden para no pisarse.
- **Coordinacion con los equipos vecinos (no es contrato de aprobacion):** los atributos de la pieza son
  nuestros y ya estan decididos; cada mod implementa su parte. El sync une los campos que varios mods
  declaran sobre un mismo objeto (como `Offering` entre cd y uengagement), asi que academic-scheduling
  agrega sus propios campos sobre la pieza desde su mod. Solo necesitan que el objeto exista publicado
  (Hito 1) para enganchar su FK. De nuestro lado corresponde un aviso de una via: la identidad del objeto
  publicado (nombre, RecordType de `Modality`, id de la FK) y que tipos de recurso lo declaran ellos.
  Unico cuidado durable: no cambiar la identidad del objeto despues de publicarlo.
- **Riesgo tecnico principal (actualizado):** que el retiro **no tome efecto o se revierta solo**, por el
  append-only del merge y por quedar sin commitear en core. Ya no es la perdida de dato, que dejo de
  aplicar. Segundo: que el total derivado no se pueda pintar y haya que replantear la presentacion a
  mitad de camino.

## Plan por etapas (hitos): insumo para el plan de sessions y tareas

> Cuando el ticket pase a spec, el plan de sessions (DET-20) debe respetar esta etapificacion. El
> **Hito 1 es el primer entregable** y se cierra por si solo: publica el objeto que espera
> academic-scheduling, sin nada destructivo. Detalle de cada hito en `UPONE-1619-detalle.md`, seccion
> "Plan de entrega (hitos)". Los SP no se re-particionan: sigue 13 SP, esto es orden de entrega.

**Hito 1 - Objetos publicados (primer entregable, aislable como primera session).**
- Catalogo de tipos de pieza (objeto + carga inicial minima).
- `InstructionalComponent` como RecordType anidado a `Modality` con sus atributos.
- Publicacion **aditiva** en core: publicar los dos en `object-manager/objects/business/`, codegen,
  migracion que crea tablas en los 18 schemas, commit con el id.
- Cierre del hito: tablas existentes en los 18 schemas y FK de academic-scheduling apuntable; sin drift;
  nada destructivo. Aviso de identidad del objeto a academic-scheduling (no aprobacion).
- Hipotesis que caen aqui: H1 (confirmada). No depende de H10/H3/H4.

**Hito 2 - Modelo funcional en el mod.**
- Derivacion del total de horas (resolver del mod, opcion A1).
- Extension del loader para anidar piezas (opcion C1) + datos del seed + conteos.
- Formulario del curso: listado anidado de piezas + total derivado.
- Cableado de capabilities de los objetos nuevos (coordinar con UPONE-1615, mismo `_data-rbac.js`).
- Las columnas de horas **siguen existiendo** en este hito: coexisten con las piezas.
- Hipotesis que caen aqui: H3, H4, H5, H6.

**Hito 3 - Retiro de las horas digitadas (destructivo, ultima session).**
- Retiro de las 4 claves del JSON del mod y en `object-manager/objects/business/`; migracion
  `DROP COLUMN` en los 18 schemas; barrido de consumidores; verificar que el sync no revierte.
- Gate previo: ventana de coordinacion con core (open decision "Ventana de ejecucion de la migracion").
- Contingencia: opcion B3 (no retirar en este ticket, dejar ticket enlazado) si la ventana no llega.
- Cierre transversal aqui: i18n es/en/pt, MCP cubierto o N/A, docs.
- Hipotesis que caen aqui: H10, H7, H9.

**Regla de particion para el spec:** cada hito cierra dejando el sistema funcional; el Hito 1 no arrastra
ninguna pieza de los otros dos; el Hito 3 se agenda al final por su gate de core. Si un hito excede el
tamano de una session (DET-20, 1.5-3h), se parte en sub-sessions internas, pero no se mezcla trabajo de
dos hitos en la misma session.

## Hipotesis a validar (para el intake)

- **H1: nada del modelo existe hoy.** Ya verificado por tres vias independientes, incluida una constancia
  fechada en el mod vecino. _Validacion: confirmada, no requiere trabajo adicional._
- **H2: ~~el rescate de datos tiene alcance real~~. Descartada (2026-08-17):** no hay dato productivo en
  up1, todo es dato de prueba. El conteo por tenant sigue siendo util para dimensionar cuanto seed
  reescribir, pero ya no condiciona el retiro.
- **H10: el retiro no toma efecto solo con cambiar el JSON del mod.** Es la hipotesis nueva y la mas
  importante del ticket, porque define si el retiro cabe aqui o necesita ticket de core. _Validacion:
  quitar las claves en el mod, correr sync y codegen, y mirar si el RecordType publicado en
  `object-manager/objects/business/` y los schemas de tenant todavia las tienen. Lo esperado, por el
  append-only del merge, es que si._
- **H3: el motor de formulas no puede agregar una coleccion de hijos.** Si se confirma, la opcion A2 queda
  descartada y la derivacion es un resolver. _Validacion: intentar declarar un campo derivado que sume
  hijos y observar si el validador lo acepta._
- **H4: el total derivado se puede pintar en el listado embebido de modalidades.** Es el riesgo de
  presentacion. _Validacion: smoke sobre el formulario de edicion de curso con el campo derivado
  declarado, mirando la pantalla real._
- **H5: el listado embebido soporta un nivel mas de anidacion** (piezas dentro del sub-layout de
  modalidad, no solo modalidades dentro de curso). _Validacion: construir el caso minimo y abrirlo en
  pantalla._
- **H6: extender el loader para resolver el padre no altera como nacen los otros ocho tipos de registro.**
  _Validacion: correr el seed completo y comparar conteos por tipo de registro antes y despues._
- **H7: el guard de modalidad por defecto sigue intacto tras el retiro de las columnas.** _Validacion:
  test de regresion de una sola modalidad por defecto por dueno._
- **H8: la identidad del objeto (nombre, RecordType de `Modality`, id de la FK) es lo que
  academic-scheduling necesita para enganchar su FK.** Los campos que ellos requieran los declaran desde su
  propio mod (el sync los une), no dependen de nuestros atributos. _Validacion: avisarles la identidad
  publicada en el Hito 1; no requiere que aprueben nuestros atributos._
- **H9: retirar las claves de horas no rompe los dos layouts de silabo.** _Validacion: abrir las dos
  vistas de silabo tras el retiro y comprobar que no queden campos vacios ni columnas rotas._

## Tipos de recurso requeridos por la pieza: **fuera de alcance**, con un pendiente que avisar

Decision del 2026-08-17: **queda fuera de este ticket** y la especificacion es de academic-scheduling.
Motivo corto: curriculum-design no consume ese dato, no tiene su especificacion, y ellos pueden declararlo
desde su propio mod. Analisis completo, evidencia y decisiones descartadas:
`sp9/UPONE-1619-tipos-de-recurso-frontera-cd-as.md`.

Lo minimo a tener presente durante la ejecucion:

- **No inventar el campo ni sus valores.** Cardinalidad, forma y valores los define el consumidor. Si
  llega su especificacion antes de cerrar el objeto, se puede incorporar; si no, el objeto cierra sin el y
  **agregarlo despues es aditivo y barato** (lo caro es retirarlo).
- **El hueco hay que avisarlo**, no solo registrarlo: su ticket 2C lo da por hecho y no esta en el alcance
  de nadie.
- **Si piden captura por pantalla**, ese input si es nuestro (el layout de la pieza) y es un cambio menor
  y aditivo, no un bloqueo de este ticket.

## Decisiones abiertas y resueltas del ticket (movido del detalle)

- [x] ~~**Rescate del dato antes del retiro.**~~ **Resuelta (2026-08-17):** no aplica. En up1 hoy **no hay
      dato productivo**, todo el dato existente es de prueba aunque se parezca al de un cliente real. El
      retiro no arriesga informacion de nadie y no necesita traduccion previa como red de proteccion. Lo
      que si sigue en el alcance es reescribir el seed con piezas, que ya estaba previsto.
- [x] ~~**Donde vive el tramo de core del retiro.**~~ **Resuelta (2026-08-17): dentro de este ticket**, como
      sub-tarea 1C-c, no en un ticket aparte. Es la misma implementacion aunque los archivos vivan en otro
      repo, es como el equipo ya trabaja (el commit "sync UPONE-1523 objects into object-manager" es del
      propio ticket de scheduling), y sacarlo reproduciria el fallo que UPONE-1623 vino a reparar: ese
      ticket existe porque UPONE-1539 cerro dejando pendiente su lado de core.
- [ ] **Ventana de ejecucion de la migracion por tenant.** Lo que sigue abierto no es donde vive el
      trabajo, es **cuando se aplica**: son 18 schemas y su `DROP COLUMN`, y conviene acordar el momento
      con core aunque el cambio lo ejecute este ticket. La decision cambio de motivo: ya no protege dato
      (no hay dato productivo), coordina el tren de core.
- [x] ~~**La brecha de agregacion del core.**~~ **Resuelta (2026-08-18): resolver propio del mod ahora.**
      La suma de horas se deriva con un resolver del mod, sin tocar core. La extension generica ("campo
      derivado de una coleccion de hijos") se propone despues, con la evidencia de este caso en mano.
- [x] ~~**Donde se declara que tipos de recurso requiere la pieza.**~~ **Resuelta (2026-08-17): fuera de
      este ticket, y la especificacion es de academic-scheduling.** No consumimos ese dato, no tenemos su
      especificacion, y ellos pueden declararlo desde su propio mod (el sync une los campos de varios mods
      sobre el mismo objeto). Lo que si queda registrado es el hueco y la dependencia de su ticket 2C, que
      hoy lo da por hecho sin que figure en ningun alcance. Analisis completo:
      `sp9/UPONE-1619-tipos-de-recurso-frontera-cd-as.md`.
- [x] ~~**Alcance del contrato con los equipos vecinos.**~~ **Reencuadrada (2026-08-18): no es un contrato
      de aprobacion.** Los atributos de la pieza son nuestros y ya estan decididos; academic-scheduling
      implementa su parte y agrega sus propios campos sobre la pieza desde su mod (el sync une campos de
      varios mods). Lo que queda es un aviso de una via en el Hito 1: comunicarles la identidad del objeto
      publicado (nombre, RecordType de `Modality`, id de la FK) y que tipos de recurso lo declaran ellos.
      Unico cuidado: no cambiar la identidad del objeto despues de publicarlo. La pregunta redactada para
      ellos sobre tipos de recurso vive en `sp9/UPONE-1619-tipos-de-recurso-frontera-cd-as.md`.
- [x] ~~**Historial de la pieza.**~~ **Resuelta (2026-08-18): no lleva historial.** Sigue el precedente de
      los RecordTypes hermanos de `CurricularSection` (Modality, Content, Session, EvaluationComponent, etc.):
      ninguno declara `enableDataLog`. El flag esta solo en objetos Base (Activity, Offering, Curriculum),
      no en los RecordTypes anidados.

## Decisiones tecnicas abiertas (las resuelve el dev o el intake)

> Distintas de las "Decisiones abiertas y resueltas del ticket" de arriba: aquellas son decisiones de
> alcance/gestion del ticket; estas son de diseno tecnico interno, sin resolucion aun.

- Nombre canonico del catalogo y del tipo de registro de la pieza, y si el catalogo va en
  curriculum-design (el patron de referencia vive en academic-scheduling, pero la pieza es de este mod).
- Donde se expone el total derivado: campo del tipo de registro de modalidad en la capa de lectura, o
  dato calculado en el resolver del arbol.
- Si el catalogo lleva prioridad u orden, siguiendo el patron del catalogo de tipos de recurso.
- Si el rescate de datos se hace por script de una vez o por el propio loader del seed.
- Cuales de los ocho atributos propuestos son obligatorios y cuales opcionales.

## Reglas y patrones, con su fuente

- Cambio de esquema por JSON, codegen y migracion generada: no escribir SQL a mano. _Fuente:
  `up1/CLAUDE.md` (Schema-Driven Development)._
- El sync regenera el modelo de todos los mods: un retiro destructivo no se aisla por mod. _Fuente:
  `up1/CLAUDE.md` (Sync Mechanism)._
- En tipos de registro las FK son ids escalares, no relaciones, y no van en las inclusiones. _Fuente:
  `up1/CLAUDE.md` (RecordType Conventions)._
- Reusar el arbol de secciones curriculares en vez de un objeto suelto: trae jerarquia, listado embebido y
  layouts asociados. _Fuente: `mods/curriculum-design/objects/CurricularSection.json:11-22, 73-81`._
- El listado embebido filtrado por el padre ya se usa en el mismo mod un nivel mas arriba. _Fuente:
  `mods/curriculum-design/config/layouts/default_Activity_edit.json:113-149`;
  `layout/docs/features/recordlist.md:540, 604`._
- El listado filtra columnas a campos reales del objeto: verificar el render, no la config. _Fuente:
  `layout/docs/reference/record-list-config-keys.md`._
- Patron de catalogo idempotente por nombre. _Fuente:
  `mods/academic-scheduling/seed/config-resourcetypes.js`._
- No editar los archivos sincronizados de componentes de mod en layout ni en suite. _Fuente:
  `up1/CLAUDE.md` (Critical Rules)._
- Capabilities de objetos nuevos cableadas a los roles curriculares existentes, sin crear roles.
  _Fuente: `mods/curriculum-design/seed/_data-rbac.js`._

## Archivos candidatos (tentativo, no mandato)

Nuevos:
- `mods/curriculum-design/objects/<CatalogoDeTiposDePieza>.json`.
- `mods/curriculum-design/objects/RecordTypes/rt__InstructionalComponent__curricularsection.json`.
- `mods/curriculum-design/seed/config-<catalogo>.js`.
- `mods/curriculum-design/config/layouts/default_rt__InstructionalComponent__curricularsection_{create,edit,view}.json`.

Modificados:
- `mods/curriculum-design/objects/RecordTypes/rt__Modality__curricularsection.json` (retiro de horas).
- `mods/curriculum-design/config/layouts/default_Activity_edit.json` (listado anidado, columnas, total).
- `mods/curriculum-design/config/layouts/default_rt__Modality__curricularsection_{view,edit,create}.json`.
- `mods/curriculum-design/config/layouts/default_Offering_syllabus_{view,edit}.json`.
- `mods/curriculum-design/modsComponents/CompositeSectionTree/resolveFieldKind.ts` (heuristica).
- `mods/curriculum-design/seed/_data-syllabus-sections.js` (loader y datos).
- `mods/curriculum-design/logic/` (resolver de derivacion).
- `mods/curriculum-design/capabilities.json` y `seed/_data-rbac.js` (capabilities de los objetos nuevos).
- `mods/curriculum-design/tests/integration/{seed-counts,recordtypes-declared}.test.ts` y
  `docs/reference/seed-counts.md`.
- `mods/curriculum-design/lang/{es,en,pt}/` (labels nuevos).
