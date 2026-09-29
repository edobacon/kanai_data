# Ticket TICKET-149 (UPONE-1770) - Tributación | Peso del eje 1, guardado en conjunto, vía masiva y vista por malla
work_type: implement · estado: cerrado · modulo: curriculum-mapping · spec: approved

## Pedido (request)
## Objetivo

Completar la captura de tributación sobre el CRUD ya entregado (UPONE-1756, fila por fila): guardado en conjunto y transaccional, gobierno del peso del eje 1 con su reparto, vía masiva, vista por malla, y dos cierres chicos (fix del selector en la vista solo lectura + test de paridad MCP del peso). Todo del lado de curriculum-mapping (backend gobernado + UI del mod). Se apoya en UPONE-1769 (modelo cableado: `contributionPercentage` nullable + índice de grupo, ya en develop).

## Alcance (dentro, cm-interno)

1. **Upsert transaccional de conjunto** de `CompetencyAlignment`, acotado a `(planId, matriz)`. Reemplazo total en `runInTransaction`, corriendo R-1..R-5/R-10 por fila y derivando `planId` server-side (REQ-01). Una sola entrada de historial. Patrón: `logic/competencyTree-upsert.resolver.js` + RBAC restituido como `curriculum-design/logic/planEntry-batch.resolver.js` (no delega en el generic; exige create+modify+delete).
   - **Scope de borrado (confirmado en código):** `CompetencyAlignment` NO tiene columna `matrixId`; se acota por `planId` + `competencyNodeId ∈ competencias de la matriz` (el `competencyAlignmentView` ya filtra así, línea 293). El batch retira SOLO las tributaciones de ese scope que no vinieron; nunca las de otras matrices adoptadas por el mismo plan, ni las "fuera de diseño" (R-12: se marcan, no se borran).
   - **Contrato de guardado (confirmado):** el cliente reenvía el conjunto completo del `(planId, matriz)` cargado (el view no pagina), así "lo que no vino = retirar" es seguro dentro de ese scope.
2. **Peso del eje 1:** agregar `contributionPercentage` a `WRITABLE_FIELDS` (`logic/helpers/validateCompetencyAlignment.js`) + validación por fila (string 0-100, 2 decimales, no truncar). **R-6:** solo `Evaluates`/`Both` pesan; `Develops` queda `null`. Grupo por `(planId, competencyNodeId, developmentLevelId)`.
3. **Reparto en partes iguales:** client-side (`weights.ts`, G-6). Estado auto/manual del grupo **derivado** (no persistido).
4. **Vía masiva:** aplicar un destino (nivel + tipo) a varias asignaturas en una transacción, con troceo en el backend (AD-12, patrón `logic/matrixAdoption.resolver.js:246-300`). Reporta cuáles se saltearon y por qué.
5. **Vista "Por malla":** modo de vista de la propia tributación (asignaturas por período), sobre los datos que `alignmentView.resolver.js` ya trae (`planEntry` con `period`/`position`). NO importa `CurriculumMesh` de curriculum-design (M-26).
6. **Fix de UI:** quitar el selector de asignatura de la vista solo lectura (pertenece solo al editor, en los dos modos).
7. **Test de paridad MCP:** extender el test para cubrir `contributionPercentage` (documenta el hueco de la vía genérica; el cierre real es de los tickets de MCP de cm, patrón `blockGenericMutation`).

## Fuera de alcance

- **Validación "suma 100 al publicar el plan" (D1):** cross-mod hacia curriculum-design, ticket aparte (ver `Pendiente cross-mod - Guard de suma al publicar el plan (D1, derivado de 1770)`).
- Indicadores y versionado del plan (UPONE-1771); outcomeAlignment y retiro con aviso (UPONE-1772); migración de niveles (UPONE-1773).
- R-9 (gate del peso por institución): legacy, no aplica en up1 (el único parámetro de tenant del mod es `cm.displayDecimals`).

## Reglas a respetar

R-1..R-5/R-10 (de 1756, por fila dentro del batch); R-6 (solo Evaluates/Both pesan); G-6 (reparto y estado derivado client-side); AD-12 (troceo en backend); M-26 (no import cross-mod de componentes); escrituras gobernadas `*Validated` con `runInTransaction`, sin CRUD generic.

## Criterios de aceptación

- El guardado de una matriz es un upsert de conjunto transaccional (todo o nada), acotado a `(planId, matriz)`; no toca otras matrices adoptadas ni las filas "fuera de diseño".
- En una celda con varias asignaturas `Evaluates`/`Both` se ve y se edita el peso de cada una; solo esas pesan (R-6).
- "Repartir en partes iguales" distribuye 100 en el grupo (client-side).
- El estado automático/manual del grupo se deriva, no se persiste (sin campo ni objeto nuevo).
- La vía masiva aplica un destino a varias asignaturas en una transacción; reporta las salteadas.
- La vista por malla y la por competencia operan sobre la misma vía gobernada (el batch).
- El selector de asignatura ya no aparece en la vista solo lectura.
- El test de paridad cubre `contributionPercentage`.
- El CRUD de tributación de 1756 sigue verde; `sync`/`codegen` sin drift; artefactos de sync no commiteados.

## Referencias (KB sp11)

- Cierre de alcance (autoritativo): `UPONE-1770 - cierre de alcance y correcciones`.
- Maqueta: `UPONE-1770 - referencias visuales de la maqueta` (10 capturas).
- Guía de ejecución: `UPONE-1770-pre-intake`. Contrato: `UPONE-1770-detalle`. Frontera: `UPONE-1770-aduana`.
- Origen del peso y del nullable: `UPONE-1756-detalle-tecnico` §7. División de tickets del PO: `UPONE-1756-plan-po`.

## Adendas al request
(la mas nueva manda sobre lo anterior, incluidos los REQs que reemplaza)

## Adendas al request

### Adenda 1 - 2026-09-16 - Eduardo (dev)

1770 EXTIENDE la tributación ya entregada (1756) reutilizando sus componentes, no la reemplaza. Además del fix del selector en solo lectura, entran como restricciones de fidelidad/reuso (no como rediseño):
(a) El editor conserva su panel lateral de SELECCIÓN con el elemento "en mano": PlanSubjectsPanel en modo por competencia; la matriz de competencias en modo por malla.
(b) Solo-lectura y edición son dos superficies distintas: la pestaña "Tributación" del plan (con "Tributar", sin selector) y la pantalla que abre "Tributar" (editor).
(c) El detalle vive en el CompetencyAlignmentDetailModal YA EXISTENTE, extendido con el bloque de peso; no un panel lateral ni un componente nuevo.
(d) La asignación es por selección lateral + click, sin drag (ni draggable ni handlers de arrastre).
Motivo: estas restricciones existen para que el ejecutor REUTILICE los componentes reales de curriculum-mapping/modsComponents/CompetencyAlignmentGrid/ y no re-invente (evitar DetailSidePanel/CompetencyLevelGrid).

**Motivo**: Refinamiento 2026-09-16: se detectó que el request original no explicitaba las restricciones de reutilización/fidelidad, y el spec las incorporó como REQ. Se registran como alcance efectivo para que deriven del request.

### Adenda 2 - 2026-09-21 - Eduardo (dev)

Guardarraíl de peso en el editor (client-side, no bloqueante del publish): el input de peso de cada fila del grupo (planId, competencyNodeId, developmentLevelId; solo Evaluates/Both, R-6) tiene un tope DINÁMICO = 100 − suma de las otras filas que pesan. Hereda el flujo del tope de 100 existente: si el valor supera el disponible (incluido el caso >100) se marca inválido, no se commitea y en el blur revierte al valor anterior. Mensaje según causa: formato inválido mantiene "Ingresa un porcentaje entre 0 y 100, con hasta 2 decimales."; superar el presupuesto usa "Solo tienes disponible {disponible}% para asignar". "Repartir en partes iguales" no pasa por el tope incremental (emite el reparto completo del grupo que suma 100). Alcance: previene que la suma del grupo SUPERE 100 en el editor; NO fuerza que sea EXACTAMENTE 100 (eso sigue siendo el guard al publicar el plan, cross-mod/D1, fuera de este ticket). Es client-side: el validador de backend por fila sigue en [0,100]; la garantía dura es el guard de publicación.

**Motivo**: Pedido del dev (2026-09-21) durante la revisión visual de la Sesión 3: al ver que la suma podía pasar de 100 (p.ej. 105%), se decidió agregar un tope dinámico por presupuesto del grupo como guardarraíl de UX, heredando el comportamiento del tope de 100 ya existente. No estaba explícito en el spec original.

### Adenda 3 - 2026-09-22 - Eduardo (dev)

Vista "Por malla" (Sesión 4) — decisiones de diseño y fidelidad tras revisión visual del dev (2026-09-21/22):
1. ARQUITECTURA (reemplaza el texto literal de S4.T3): el shell es ORQUESTADOR y monta por modo el par sidebar+superficie: por competencia (PlanSubjectsPanel + CompetencyAlignmentGridTable) y por malla (MatrixCompetenciesPanel + MatrixMeshView). NO se fusiona por-malla dentro de CompetencyAlignmentGridTable ni se borra un "componente paralelo": MatrixMeshView es una superficie hermana que REUTILIZA el mismo modal de detalle (CompetencyAlignmentDetailModal) y la misma vía de guardado gobernada (performAssign, per-field). Cumple el objetivo real de REQ-08 (no re-inventar detalle/guardado), no su letra ("sin componente nuevo").
2. La card de asignatura muestra las COMPETENCIAS que tributa (relación invertida respecto de por-competencia); períodos en columnas; título de período como card con fondo de color.
3. Panel de competencias = espejo del panel de asignaturas: buscador, filtros Todas/Con asignaturas/Sin asignaturas (contador de ASIGNATURAS distintas, no de tributaciones), lista scrolleable de altura fija; SOLO lista competencias hoja (las que consolidan quedan fuera del listado); nivel de desarrollo como SELECTOR (dropdown) con default al primer nivel y reset al cambiar de competencia.
4. "+ Asignar acá" = mismo elemento visual que por competencia; "Varias" es gancho a la vía masiva (S5), oculto en solo lectura; interacción selección+click sin drag; empty state de card "Sin tributar" (naranja), empty de competencia "Sin asignaturas".

**Motivo**: Refinamientos de la revisión visual del dev sobre la vista por malla; incluye la decisión de arquitectura (orquestador) que se aparta del texto literal de S4.T3/REQ-08 pero cumple su objetivo real, para que quede como alcance efectivo y el gate lo reconozca.

### Adenda 4 - 2026-09-22 - Eduardo (dev)

Guardado accionable en conjunto (Guardar/Descartar) — formaliza REQ-18/REQ-19/REQ-20 (Sesión 7). Deriva del criterio de aceptación de UPONE-1770 ("el guardado de una matriz es un upsert de conjunto y transaccional") y de REQ-01/REQ-11, que las sesiones de frontend S3/S4 habían entregado como guardado per-field (decisión intermedia). Se agrega la conversión explícita del editor a guardado en conjunto: (1) BORRADOR en memoria del conjunto (planId, matriz); todas las acciones de ambos modos mutan el borrador sin persistir per-field; (2) barra "Guardar Tributación" (commitea el conjunto completo por upsertCompetencyAlignmentSetValidated, transaccional todo-o-nada, refresca snapshot al éxito, conserva el borrador ante error) y "Descartar cambios" (revierte al snapshot), deshabilitados sin cambios; (3) aviso de cambios sin guardar al cambiar de matriz. Labels exactos del dev: "Guardar Tributación" / "Descartar cambios". FUERA DE ALCANCE (confirmado con el dev): el guard de "suma 100 al publicar el plan" sigue diferido al pendiente cross-mod D1; y el aviso de salida del editor por pestaña/router (no interceptable desde el element sin infra de vue-router/Vueform).

**Motivo**: El juez de spec pidió formalizar la trazabilidad de REQ-18/19/20 (que citaban un "Pedido de enmienda 2026-09-22" no reflejado en Adendas). Origen: al revisar en Jira, UPONE-1770 exige el guardado transaccional de conjunto, que no se había entregado en el frontend (quedó per-field en S3/S4); se agrega la sesión de conversión.

### Adenda 5 - 2026-09-22 - Eduardo (dev)

Vía masiva en modo malla — conducta correcta según maqueta ("Agregar competencias"), corrige la semántica INVERTIDA que entregó la Sesión 5. Desde la card de una asignatura, el botón "Varias"/"Agregar competencias" abre un modal cuyo DESTINO FIJO es esa asignatura (título "Se asociarán a <código> · <asignatura>") y permite asociarle VARIAS COMPETENCIAS a la vez. NO usa la competencia "en mano" del panel. Detalle:
1. La lista son las COMPETENCIAS HOJA de la(s) matriz(es) adoptada(s), agrupadas por matriz con contador por grupo.
2. Las competencias que la asignatura YA tributa aparecen tildadas, en gris y con la etiqueta "Ya tributa", NO seleccionables (su retiro sigue siendo por la "x" del chip en el editor, con confirmación). Solo se pueden marcar las que aún no tributa; el contador "N seleccionado(s)" cuenta solo las nuevas.
3. Selectores de Nivel de desarrollo + Tipo de contribución arriba, que se aplican a TODO lo nuevo seleccionado; cada fila queda ajustable después por separado en el editor normal.
4. Buscador por texto (código / competencia / matriz), botones "Todos"/"Ninguno", botón de acción "Asociar".
5. INTEGRACIÓN AL BORRADOR (coherencia con el guardado en conjunto de la Sesión 7): "Asociar" NO commitea de inmediato; agrega N filas al borrador en memoria (una por competencia nueva, con el nivel+tipo elegidos) y se persisten con "Guardar Tributación" por el upsert de conjunto transaccional. Esto elimina el aviso de "descartar cambios sin guardar" al abrir, el estado obsoleto (ahora lee del borrador, no del snapshot persistido) y el re-baseline mudo tras aplicar. La mutation masiva server-side de S5 (bulkApplyCompetencyAlignmentValidated) queda sin uso desde el editor; la validación por fila (R-1..R-5/R-10) la corre el upsert de conjunto al guardar, por lo que el modal ya no muestra el panel de "salteadas" de S5 (coherente con la maqueta, que tampoco lo muestra).

**Motivo**: Revisión visual del dev (2026-09-22) con la maqueta de "Agregar competencias": la Sesión 5 construyó la vía masiva con la semántica invertida (competencia en mano → N asignaturas, lista de asignaturas) y como transacción inmediata separada del borrador. La maqueta define lo contrario (asignatura fija → N competencias) e integrado al guardado en conjunto. Se registra como alcance efectivo para rehacer la vía masiva en una sesión de rediseño.

### Adenda 6 - 2026-09-23 - Eduardo (dev)

Dos cambios antes del cierre:

1. FILA DE PESO DEL MODAL DE DETALLE (look & feel): en el bloque "Peso dentro de <nivel>" de CompetencyAlignmentDetailModal, cada fila muestra hoy solo el código de la asignatura. Pasa a una etiqueta de DOS LÍNEAS: arriba el código en un tamaño menor, abajo el nombre de la asignatura, el conjunto centrado verticalmente con el input de % que le corresponde. Si falta el nombre, cae al código (una sola línea). El aria-label del input pasa a "código · nombre".

2. VÍA MASIVA "AGREGAR ASIGNATURAS" EN EL MODO POR COMPETENCIA (espejo de la vía "Agregar competencias" del modo malla, REQ-21/REQ-22):
- Cada fila de competencia de la grilla del editor (columna COMPETENCIA, junto al badge de niveles) muestra un botón "Varias" (con ícono de lista), SOLO si la competencia es destino válido (no las que consolidan) y SOLO en edición (oculto en solo lectura).
- Abre el modal "Agregar asignaturas" con DESTINO FIJO = esa competencia (subtítulo "Se asociarán a <código> · <competencia>."). No usa la asignatura "en mano" del panel lateral.
- La lista son las ASIGNATURAS del plan agrupadas por PERÍODO (encabezado "Período N" con contador y checkbox de grupo que marca/desmarca solo las seleccionables del período). Cada fila: checkbox + código + nombre. Las asignaturas que YA tributan esa competencia (en cualquier nivel) aparecen tildadas, en gris, con la etiqueta "Ya tributa" y NO son seleccionables; el estado "Ya tributa" se deriva del BORRADOR.
- Arriba: selector Nivel de desarrollo (acotado a los niveles que declara la competencia, default el primero) con glosa "Con qué profundidad la aborda.", selector Tipo de contribución (obligatorio, default Desarrolla, mismo enum fijo) con glosa "Solo Evalúa y Ambas generan evidencia de logro.", y la nota "Estos dos valores se aplican a todo lo seleccionado. Después se puede ajustar cada fila por separado."
- Buscador por código o nombre de asignatura, botones "Todos"/"Ninguno" (solo sobre las nuevas visibles), contador "N seleccionado(s)", acciones "Cancelar" y "Asociar" (deshabilitado con 0).
- "Asociar" NO commitea: agrega N filas al BORRADOR (una por asignatura nueva, con el nivel y tipo elegidos) y marca dirty; se persiste con "Guardar Tributación" (upsert de conjunto). Sin transacción inmediata, sin re-baseline.
- Implementación: se GENERALIZA el modal masivo existente (CompetencyAlignmentBulkApplyModal) a una asociación masiva en ambas direcciones con ítems genéricos (id, código, nombre, grupo, ya-tributa); el shell arma "asignaturas por período" (modo por competencia) o "competencias por matriz" (modo malla). No se crea un modal paralelo. La vía de malla (REQ-21/REQ-22) no cambia de comportamiento.

**Motivo**: Revisión del dev antes del cierre (2026-09-23) contra la maqueta: (1) la fila de peso del modal de detalle solo muestra el código de la asignatura, poco intuitivo; (2) el modo Por competencia perdió su vía masiva "Varias" / "Agregar asignaturas" (maqueta 1770-maqueta-editor-agregar-asignaturas.png y 1770-maqueta-editor-por-competencia.png) cuando la Sesión 8 rehízo el modal masivo para el modo malla.

### Adenda 7 - 2026-09-23 - Eduardo (dev)

Correcciones de la review pre-cierre (commit c61029f en curriculum-mapping):
1. RBAC del guardado en conjunto POR OPERACION EFECTIVA (reemplaza el "exige create+modify+delete" de REQ-01): upsertCompetencyAlignmentSetValidated pide competencyalignment:create solo si el conjunto agrega filas, modify solo si edita alguna (una fila reenviada igual a la persistida no cuenta) y delete solo si retira alguna. El chequeo corre dentro de la transaccion, despues de clasificar y antes de la primera escritura: un permiso faltante rechaza el conjunto entero. Motivo: los perfiles del mod reparten las capabilities (Disenador create/modify, Autoridad delete) y exigir las tres dejaba sin guardado a un perfil que solo crea y edita; mismo criterio que planEntry-batch de curriculum-design.
2. Una fila reenviada sin cambios no se reescribe ni entra al historial; los planEntry de todas las filas se leen en una sola consulta (antes una por fila dentro de la transaccion).
3. En el borrador, retirar y volver a asignar el mismo par (asignatura, competencia) antes de guardar conserva el id persistido: es una edicion, no un alta (antes el guardado se rechazaba por par duplicado).
4. Doc de referencia del objeto (docs/reference/competencyalignment-object.md) actualizada.

**Motivo**: Review de kn-dredd previa al cierre (2026-09-23): veredicto iterar; el dev eligio corregir los hallazgos de permisos, re-agregar, rendimiento y doc antes de cerrar.

## REQs del spec
## Requirements

### REQ-01 `confirmed`
> Fuente: curriculum-mapping/logic/competencyTree-upsert.resolver.js (patrón; consumidor curriculum-mapping/tests/unit/competencyTreeUpsert.test.js:14) + curriculum-mapping/CLAUDE.md:177,187 (runInTransaction)

El guardado de una matriz es un upsert de conjunto transaccional (todo o nada) sobre CompetencyAlignment, acotado a (planId, matriz), con planId derivado server-side, R-1..R-5/R-10 corridas por fila dentro de la transacción, una sola entrada de historial y RBAC propio que exige create+modify+delete (patrón competencyTree-upsert, sin delegar en el CRUD generic).

### REQ-02 `confirmed`
> Fuente: curriculum-mapping/logic/alignmentView.resolver.js:293 (competencyAlignmentView filtra por planId + competencias de la matriz) + curriculum-mapping/docs/reference/competencyalignment-object.md:118

El scope de retiro del batch es planId + competencyNodeId perteneciente a las competencias de la matriz enviada (CompetencyAlignment no tiene columna matrixId): el batch nunca retira tributaciones de otras matrices adoptadas por el mismo plan, ni las filas "fuera de diseño" (R-12: se marcan, no se borran).

### REQ-03 `confirmed`
> Fuente: curriculum-mapping/logic/helpers/validateCompetencyAlignment.js + curriculum-mapping/objects/CompetencyAlignment.json:73 + RULE-curriculum-mapping-rubric-weight-percentage-UPONE-1758

contributionPercentage es un campo escribible por la vía gobernada (WRITABLE_FIELDS) y se valida por fila como porcentaje en [0,100] con máximo 2 decimales, transportado como string y persistido sin truncar, reusando el criterio de precisión ya vigente en el módulo (isValidWeight/hasWeightPrecision) en vez de duplicarlo.

### REQ-04 `confirmed`
> Fuente: curriculum-mapping/docs/reference/competencyalignment-object.md:37,44 + decisión "CompetencyAlignment incorpora contributionPercentage e indice compuesto (planId, competencyNodeId, developmentLevelId)"

R-6: solo las filas de tipo Evaluates o Both admiten peso; una fila Develops queda con contributionPercentage null, y el agrupamiento del peso es por (planId, competencyNodeId, developmentLevelId).

### REQ-05 `confirmed`
> Fuente: Maqueta 1770-maqueta-editor-detalle-peso.png (KB sp11, UPONE-1770 - referencias visuales de la maqueta); UPONE-1770 - cierre de alcance y correcciones (G-6)

Dentro del CompetencyAlignmentDetailModal en modo edicion, el bloque de peso "Peso dentro de <nivel>" ofrece un input con sufijo %, el badge de estado "REPARTO AUTOMATICO", el indicador "<N> evalua · suma <S>%" del grupo y la accion "Repartir en partes iguales", que distribuye 100 entre las filas que pesan (Evaluates/Both) del grupo (planId, competencyNodeId, developmentLevelId) enteramente client-side en un helper puro (weights.ts, G-6), respetando el limite de 2 decimales y ajustando el residuo para que la suma de 100. La accion no vive en un panel lateral.

### REQ-06 `confirmed`
> Fuente: Maqueta 1770-maqueta-editor-detalle-peso.png; UPONE-1770 - cierre de alcance y correcciones (G-6, estado derivado)

El estado automatico/manual de un grupo se deriva en runtime de los pesos actuales (automatico cuando coinciden con el reparto en partes iguales; manual en cualquier otro caso) y se refleja en el badge del bloque de peso del modal ("REPARTO AUTOMATICO" cuando aplica); no se persiste: no se agrega campo, objeto ni columna nueva.

### REQ-07 `confirmed`
> Fuente: Maqueta 1770-maqueta-editor-por-malla-en-mano.png (accion "Varias" en la card); logic/matrixAdoption.resolver.js:246-300 (troceo, AD-12)

La via masiva, accesible desde la accion "Varias" de la card o celda de destino, aplica un destino (nivel de desarrollo + tipo) a varias asignaturas en una sola transaccion, con el trabajo troceado en el backend (AD-12, patron matrixAdoption), y devuelve el detalle de las asignaturas aplicadas y de las salteadas con su motivo (duplicado existente, fuera de la matriz, regla R-1..R-5/R-10 no cumplida). Es un camino aparte del mecanismo individual de seleccion + click (REQ-16).

### REQ-08 `confirmed`
> Fuente: KB sp11: `UPONE-1770 - cierre de alcance y correcciones` (vista por malla, M-26) + `UPONE-1770-detalle` (planEntry con period/position en alignmentView.resolver.js)

El editor de tributacion ofrece la vista "Por malla" reutilizando los componentes ya existentes de modsComponents/CompetencyAlignmentGrid/ (CompetencyAlignmentGridTable para la grilla y CompetencyAlignmentDetailModal para el detalle): las asignaturas del plan se dibujan como cards agrupadas por periodo y ordenadas por position, con los datos de planEntry que ya trae alignmentView.resolver.js, sin importar componentes ni el objeto CurriculumMesh de curriculum-design (M-26) y sin crear un componente de grilla nuevo. Cada card expone "+ Asignar aca" cuando hay una competencia en mano (REQ-17) y "Varias" para la via masiva (REQ-07); la interaccion de asignacion es la de REQ-16 (seleccion lateral + click, sin drag), referenciada y no re-enunciada aca.

### REQ-09 `confirmed` `enforcement`
> Fuente: Adenda 1 (c) + decision A del dev (2026-09-22): en up1 la edicion se habilita por el modo global del registro, no por una accion del modal; REQ-14 (solo lectura y edicion son superficies distintas).

El detalle de una tributacion vive en el CompetencyAlignmentDetailModal YA EXISTENTE en modsComponents/CompetencyAlignmentGrid/ (Modal de @molecules, v-model:open), que 1770 EXTIENDE sin rediseniar ni duplicar, y tiene dos estados resultantes: (a) SOLO LECTURA: muestra la asignatura y la competencia a la que tributa, el nivel de desarrollo, el tipo de contribucion con su glosa y la matriz de competencia, y su pie tiene UNICAMENTE la accion "Listo" (en up1 se pasa a edicion por el modo global del registro: NO existe un boton "Editar en tributacion" en el modal); (b) EDICION: muestra el nivel de desarrollo como control segmentado limitado a los niveles que la competencia declara, el tipo de contribucion como control segmentado, el bloque de peso (REQ-05) y las acciones "Retirar tributacion" y "Listo". No existe un panel lateral de detalle ni un componente de detalle paralelo.

### REQ-10 `confirmed`
> Fuente: Adenda 1 al request (2026-09-16, Eduardo dev), punto (b): solo-lectura y edicion son dos superficies distintas; la pestana "Tributacion" del plan va con "Tributar" y sin selector. Refuerza el punto 6 del alcance del request (fix de UI: quitar el selector de la vista solo lectura).

La vista solo lectura de tributacion es la pestana "Tributacion" del plan: no muestra el selector de asignatura en ninguno de sus dos modos (por asignatura y por competencia) y expone el boton "Tributar" que abre el editor; su barra de acciones no se mezcla con la grilla editable.

### REQ-11 `confirmed`
> Fuente: Criterio de aceptacion del request: "La vista por malla y la por competencia operan sobre la misma via gobernada (el batch)"; mas Adenda 1 al request (2026-09-16), motivo explicito de reuso de los componentes reales de curriculum-mapping/modsComponents/CompetencyAlignmentGrid/ en vez de re-inventar.

Las dos vistas del editor (por competencia y por malla) se dibujan con la misma CompetencyAlignmentGridTable y operan sobre la misma via gobernada: ambas producen el mismo payload de batch para (planId, matriz) y se guardan con la misma mutacion, sin CRUD generic.

### REQ-12 `inferred`
> Fuente: curriculum-mapping/tests/unit/competencyAlignmentSchemaAdditions.test.js:4 (agregados de 1769) + spec existente "MCP · Curriculum Mapping (lectura del subconjunto estable)"

El test de paridad MCP se extiende para cubrir contributionPercentage, documentando que la vía genérica aún lo permite (el cierre real es de los tickets de MCP de cm, patrón blockGenericMutation).

### REQ-13 `confirmed` `enforcement`
> Fuente: KB sp11: `UPONE-1770 - cierre de alcance y correcciones` (panel de seleccion por modo) + `UPONE-1770-detalle`

El editor muestra un panel lateral de SELECCION que define el elemento "en mano": en el modo por competencia se reutiliza PlanSubjectsPanel (lista de asignaturas del plan) y en el modo por malla el panel es "COMPETENCIAS DE LA MATRIZ" con el selector "Nivel de desarrollo con que se va a asignar". En ambos modos el elemento elegido queda en mano con el chip "EN MANO · <elemento>" y una "x" para soltarlo, y se aplica al destino segun el mecanismo definido en REQ-16 (seleccion lateral + click en "+ Asignar aca", sin drag); este REQ no re-enuncia esa regla, solo la referencia. El panel de seleccion es exclusivo de las vistas de edicion.

### REQ-14 `confirmed` `enforcement`
> Fuente: Pedido de enmienda TICKET-149 punto 3 + `UPONE-1770 - referencias visuales de la maqueta`

Solo lectura y edicion son dos superficies distintas: (a) la pestana "Tributacion" del plan, de solo lectura, con el boton "Tributar" y sin selector ni panel de seleccion; (b) el editor, la pantalla que abre "Tributar", compuesto por el panel de seleccion (PlanSubjectsPanel o la matriz segun el modo), CompetencyAlignmentGridTable y CompetencyAlignmentDetailModal. Ningun componente de una superficie se monta en la otra.

### REQ-16 `confirmed` `enforcement`
> Fuente: KB sp11: `UPONE-1770 - cierre de alcance y correcciones` (mecanismo seleccion + click, sin drag) + `UPONE-1770 - referencias visuales de la maqueta` (chip EN MANO y accion "+ Asignar aca")

REQUISITO UNICO de la regla de interaccion sin drag: la asignacion en el editor de tributacion se hace por SELECCION LATERAL + CLICK y nunca por arrastre. (a) Se elige un elemento en el panel lateral y queda EN MANO, indicado con el chip "EN MANO · <elemento>" y una "x" para soltarlo (un click sobre el elemento ya elegido tambien lo suelta); (b) con algo en mano, cada destino valido de la grilla o card muestra la accion "+ Asignar aca" y al hacer click se crea o mueve la tributacion; (c) sin nada en mano el "+" queda atenuado y el shell avisa "selecciona una asignatura/competencia". CompetencyAlignmentGridTable y las cards del modo por malla no declaran draggable ni handlers de arrastre (dragstart/dragover/drop), y no existe un equivalente por teclado. Esta regla se enuncia una sola vez: REQ-16 es el unico numero valido para referirla, y toda mencion en prosa del spec, tags de vista, tabla de deltas/conflictos y casos de prueba debe apuntar a REQ-16; ningun otro REQ (en particular REQ-08, REQ-13 y REQ-17) re-enuncia la regla: solo la referencian.

### REQ-17 `confirmed` `enforcement`
> Fuente: KB sp11: `UPONE-1770 - cierre de alcance y correcciones` (modo por malla, panel de competencias y selector de nivel) + `UPONE-1770 - referencias visuales de la maqueta`

El modo "Por malla" del editor es el espejo del modo por competencia en cuanto a QUE se pone en mano: el panel lateral es "COMPETENCIAS DE LA MATRIZ", lo puesto en mano es una COMPETENCIA (chip "EN MANO · <competencia>" con una "x" para soltarla) acompaniada de un selector "Nivel de desarrollo con que se va a asignar", y cada card de asignatura agrupada por periodo expone el destino "+ Asignar aca", quedando tras asignar con su chip de tributacion mas una confirmacion visible. El MECANISMO de asignacion (seleccion lateral + click, sin drag) no se re-enuncia aca: es el de REQ-16 y este REQ solo lo referencia. La accion "Varias" de cada card es el camino aparte hacia la via masiva (REQ-07), no el mecanismo de asignacion individual.

### REQ-18 `confirmed`
> Fuente: Pedido de enmienda (2026-09-22), tareas 1 y 3: modelo BORRADOR con dirty tracking en el shell; rewire de todas las acciones del editor en ambos modos, sin persistir al instante.

El editor de tributacion mantiene un BORRADOR en memoria del conjunto (planId, matriz) en el shell CompetencyAlignmentGridElement: al cargar la matriz se toma un snapshot del conjunto persistido, y TODAS las acciones de edicion de AMBOS modos (asignar, mover, retirar, cambio de nivel de desarrollo, cambio de tipo de contribucion, edicion de peso, repartir en partes iguales y el tope dinamico de peso de la Adenda 2) mutan ese borrador y marcan dirty, sin persistir al instante: se elimina el guardado inmediato per-field (performAssign y equivalentes dejan de emitir mutaciones por campo).

### REQ-19 `confirmed`
> Fuente: Pedido de enmienda (2026-09-22), tarea 2 y criterio "esta sesion CUMPLE REQ-01 y REQ-11"; mutacion upsertCompetencyAlignmentSetValidated construida en la Sesion 2.

El editor expone un guardado ACCIONABLE del conjunto: la accion "Guardar" valida el borrador y commitea el conjunto completo de (planId, matriz) en una UNICA llamada a upsertCompetencyAlignmentSetValidated (transaccional, todo-o-nada: si el backend rechaza, no se aplica ningun cambio y el borrador se conserva con el error a la vista), y la accion "Descartar" revierte el borrador al ultimo estado guardado. Ambos modos (por competencia y por malla) producen el MISMO payload de batch para (planId, matriz) y guardan por esa misma via gobernada, sin CRUD generic (REQ-01, REQ-11). Guardar/Descartar quedan deshabilitados cuando no hay cambios pendientes.

### REQ-20 `confirmed`
> Fuente: Pedido de enmienda (2026-09-22), tarea 4: aviso de cambios sin guardar al salir del editor o cambiar de matriz.

Con cambios sin guardar en el borrador, el editor avisa antes de perderlos: al salir del editor (volver a la pestana "Tributacion" o navegar fuera) y al cambiar de matriz se muestra una confirmacion que permite continuar (descartando) o cancelar la salida; si se cancela, el borrador queda intacto y no se cambia de matriz ni de pantalla. Sin cambios pendientes no se muestra aviso.

### REQ-21 `confirmed` `enforcement`
> Fuente: Adenda 5 - 2026-09-22 (maqueta "Agregar competencias"); UPONE-1770 - referencias visuales de la maqueta

La via masiva del modo malla es "Agregar competencias": se abre desde la accion "Varias" de la card de una asignatura y su DESTINO es FIJO = esa asignatura (subtitulo "Se asociaran a <codigo> · <asignatura>"); NO usa la competencia "en mano" del panel lateral. La lista son las COMPETENCIAS HOJA de la(s) matriz(es) adoptada(s), agrupadas por matriz con contador por grupo; las competencias que la asignatura YA tributa se muestran tildadas, en gris, con la etiqueta "Ya tributa" y NO son seleccionables (su retiro sigue siendo por la "x" del chip en el editor); solo se marcan las nuevas y el contador "N seleccionado(s)" cuenta unicamente esas. Arriba ofrece los selectores Nivel de desarrollo + Tipo de contribucion (mismo enum fijo de contributionTypes.ts) que se aplican a todo lo nuevo seleccionado, quedando cada fila ajustable despues por separado en el editor; ademas buscador por texto (codigo / competencia / matriz), botones "Todos"/"Ninguno" y el boton de accion "Asociar". Queda derogada la semantica invertida de la Sesion 5 (competencia en mano -> N asignaturas, lista de asignaturas).

### REQ-22 `confirmed` `enforcement`
> Fuente: Adenda 5 punto 5 - 2026-09-22; REQ-18/REQ-19 (guardado en conjunto, Adenda 4)

La accion "Asociar" de "Agregar competencias" NO commitea: agrega N filas al BORRADOR en memoria del conjunto (planId, matriz) en competencyAlignmentDraft.logic.ts (una fila por competencia nueva, con el nivel de desarrollo y tipo de contribucion elegidos) y marca dirty; la persistencia ocurre recien con "Guardar Tributacion" por upsertCompetencyAlignmentSetValidated (REQ-18/REQ-19), que corre R-1..R-5/R-10 por fila. En consecuencia: el estado "Ya tributa" se deriva del BORRADOR y no del snapshot persistido; el modal no dispara la mutation masiva inmediata (bulkApplyCompetencyAlignmentValidated queda sin uso desde el editor); el shell no muestra el guard de "descartar cambios sin guardar" al abrir el modal ni hace re-baseline por loadView al aplicar; y el modal no muestra panel de resultado con "salteadas" (coherente con la maqueta).

### REQ-23 `confirmed` `enforcement`
> Fuente: Adenda 6 - 2026-09-23 - Eduardo (dev), punto 1 (fila de peso del modal de detalle); maqueta 1770

En el bloque "Peso dentro de <nivel>" del CompetencyAlignmentDetailModal, cada fila de peso muestra una etiqueta de DOS lineas: arriba el codigo de la asignatura en tamanio menor y abajo el nombre de la asignatura, el conjunto centrado verticalmente respecto del input de % que le corresponde. Si la fila no tiene nombre de asignatura, la etiqueta cae al codigo en una sola linea (sin renglon vacio). El aria-label del input de % pasa a "codigo · nombre". Es una extension de look & feel de la fila ya existente del bloque de peso (REQ-05), no un componente nuevo ni un panel lateral.

### REQ-24 `confirmed`
> Fuente: Adenda 6 - 2026-09-23 - Eduardo (dev), punto 2 (via masiva "Agregar asignaturas" en el modo por competencia); maquetas 1770-maqueta-editor-agregar-asignaturas.png y 1770-maqueta-editor-por-competencia.png

El modo "Por competencia" del editor expone la via masiva "Agregar asignaturas": cada fila de competencia de la grilla (columna COMPETENCIA, junto al badge de niveles) muestra un boton "Varias" SOLO si la competencia es destino valido (no las que consolidan) y SOLO en edicion (oculto en solo lectura). Al abrirlo, el modal masivo tiene DESTINO FIJO = esa competencia (subtitulo "Se asociaran a <codigo> · <competencia>.") y no usa la asignatura "en mano" del panel lateral. La lista son las ASIGNATURAS del plan agrupadas por PERIODO (encabezado "Periodo N" con contador y checkbox de grupo que marca/desmarca solo las seleccionables de ese periodo); cada fila es checkbox + codigo + nombre; las asignaturas que YA tributan esa competencia en cualquier nivel aparecen tildadas, en gris, con la etiqueta "Ya tributa" y NO son seleccionables, con ese estado derivado del BORRADOR (REQ-18) y no del snapshot persistido. Arriba ofrece el selector Nivel de desarrollo acotado a los niveles que declara la competencia (default el primero) con la glosa "Con que profundidad la aborda.", el selector Tipo de contribucion obligatorio (default Desarrolla, mismo enum fijo de contributionTypes.ts) con la glosa "Solo Evalua y Ambas generan evidencia de logro." y la nota "Estos dos valores se aplican a todo lo seleccionado. Despues se puede ajustar cada fila por separado."; ademas buscador por codigo o nombre de asignatura, botones "Todos"/"Ninguno" que operan solo sobre las nuevas visibles, contador "N seleccionado(s)" que cuenta solo las nuevas, y las acciones "Cancelar" y "Asociar" (deshabilitada con 0 seleccionadas). "Asociar" NO commitea: agrega N filas al BORRADOR (una por asignatura nueva, con el nivel y tipo elegidos) y marca dirty, sin llamada de red, sin transaccion inmediata y sin re-baseline; la persistencia ocurre con "Guardar Tributacion" por upsertCompetencyAlignmentSetValidated (REQ-19). Implementacion: se GENERALIZA el modal masivo existente CompetencyAlignmentBulkApplyModal a una asociacion masiva direccional con items genericos (id, codigo, nombre, grupo, ya-tributa), y el shell arma "asignaturas por periodo" (modo por competencia) o "competencias por matriz" (modo malla); no se crea un modal paralelo y la via de malla (REQ-21/REQ-22) no cambia de comportamiento.

## Sesiones y criterio de gate
(promesa de cada sesion; se quito la evidencia que agrego el ejecutor)
- Session 7 · T2 · continue: **Gate (auto)**: Guardado en conjunto (Guardar/Descartar) operativo en el editor de tributación, cumpliendo REQ-01/REQ-11/REQ-18/REQ-19/REQ-20, más los tests de fidelidad de componentes reales (S7.T1). El editor trabaja sobre un BORRADOR en memoria (competencyAlignmentDraft.logic.ts): al cargar la matriz toma snapshot; TODAS las acciones de AMBOS modos (asignar/mover/retirar, nivel, tipo, peso, repartir, tope dinámico) mutan el borrador SIN persistir per-field (se quitaron las mutaciones por campo). Barra de guardado: "Guardar Tributación" valida y commitea el conjunto completo de (planId, matriz) en UNA llamada a upsertCompetencyAlignmentSetValidated (transaccio [...]
- Session 1 · T1 · continue: **Gate (auto)**: Peso validado de punta a punta en el backend gobernado: el validador de CompetencyAlignment acepta contributionPercentage como string en [0,100] con 2 decimales sin truncar y rechaza cualquier valor en filas Develops (R-6), con la clave de grupo (planId, competencyNodeId, developmentLevelId) explicita. Se revisa corriendo la suite unitaria del validador (rango, precision, no truncado, los tres tipos, mensaje por fila con indice) y npm run sync sin drift.
- Session 2 · T1 · continue: **Gate (auto)**: El guardado de una matriz es un upsert de conjunto transaccional: se ejecuta la mutacion de batch para un (planId, matriz) y se observa que reemplaza el conjunto, retira solo lo del scope planId + competencias de la matriz, no toca otra matriz adoptada ni las filas fuera de diseno, revierte entero ante una fila invalida, deriva planId server-side, deja una sola entrada de historial y rechaza un RBAC sin create+modify+delete. Se revisa con la suite de integracion del batch (incluida la regresion del CRUD de 1756) y sync/codegen sin drift ni artefactos commiteados.
- Session 3 · T2 · continue: **Gate (auto)**: Editor de tributación por competencia usable end-to-end, ceñido a cómo funciona up1. En up1 el ver/editar es el MODO del registro (enableEdit por layout: default_Curriculum_view.json=false, default_Curriculum_edit.json=true), NO un botón "Tributar". En MODO VER: la pestaña "Tributación" no muestra el panel de selección de asignatura (PlanSubjectsPanel) ni afordances de asignar; el modal de detalle abre en solo-lectura con nivel/tipo como texto con glosa y pie SOLO "Listo" (decisión A del dev 2026-09-21: NO botón "Editar en tributación", porque en up1 se edita por el modo global del registro). En MODO EDICIÓN: panel PlanSubjectsPanel + CompetencyA [...]
- Session 4 · T2 · continue: **Gate (auto)**: Modo "Por malla" del editor operativo, ceñido a cómo funciona up1 y a las decisiones del dev (ver Adenda 3). ARQUITECTURA: el shell ORQUESTA por modo el par sidebar+superficie: por competencia (PlanSubjectsPanel + CompetencyAlignmentGridTable) y por malla (MatrixCompetenciesPanel + MatrixMeshView). MatrixMeshView es una superficie hermana (NO se fusiona en la grilla ni se borra); ambas superficies COMPARTEN el mismo CompetencyAlignmentDetailModal y la misma vía de guardado gobernada (performAssign, PER-FIELD; NO batch — el batch de S2 queda para una sesión futura; el "=100" es el guard al publicar D1). PANEL "COMPETENCIAS DE LA MATRIZ": espejo de [...]
- Session 5 · T2 · continue: **Gate (auto)**: Via masiva viva: desde 'Varias' en una card o celda de destino se eligen varias asignaturas y un destino (nivel + tipo), se aplica en una sola transaccion con troceo en el backend y el panel de resultado lista las aplicadas y las salteadas con codigo, nombre y motivo. Se revisa en pantalla y con los tests de lote valido, lote con duplicados, item fuera del plan, fallo con reversion total y lote de 200 sin timeout.
- Session 6 · T1 · continue: **Gate (auto)**: Cierre verificable: el test de paridad MCP cubre contributionPercentage y deja asentado el hueco de la via generica; el editor no contiene mencion alguna a drag/arrastrar/draggable/'equivalente por teclado' ni a un panel lateral de detalle en codigo, copys ni documentacion. Se revisa con la suite completa de curriculum-mapping en verde (CRUD de 1756 incluido), la suite de paridad MCP, el grep de fidelidad sin resultados y npm run sync/codegen sin drift con los artefactos fuera del commit.
- Session 8 · continue: **Gate (strong)**: La vía masiva del modo malla queda como "Agregar competencias": destino fijo = la asignatura de la card, la lista son competencias hoja agrupadas por matriz, las ya tributadas aparecen tildadas/grises/no seleccionables con "Ya tributa", buscador de texto + Todos/Ninguno, Nivel+Tipo aplicados a lo nuevo, botón "Asociar". "Asociar" agrega filas al BORRADOR en memoria (no persiste; no hay transacción inmediata, ni guard de descartar cambios al abrir, ni re-baseline por loadView) y se guardan por el upsert de conjunto de "Guardar Tributación". Sin dependencia de competencia en mano. Suite del mod verde, vue-tsc 0, sync/codegen sin drift.
- Session 9 · continue: **Gate (strong)**: Adenda 6: (1) la fila de peso del modal de detalle muestra código (chico) + nombre de la asignatura en dos líneas, centrado con su input %; (2) el modo Por competencia tiene "Varias" en cada fila de competencia destino válido (oculto en solo lectura y en las que consolidan) que abre "Agregar asignaturas": destino fijo = la competencia, asignaturas agrupadas por período con checkbox de grupo, "Ya tributa" derivado del borrador y bloqueado, buscador, Todos/Ninguno, nivel acotado a los declarados + tipo, "Asociar" agrega al borrador sin red. El modal masivo queda generalizado (un solo componente para ambas direcciones) y la vía de malla no cambia. Suit [...]

## Test cases esperados
- [boundary] REQ-05 (adenda 2, tope dinámico): En un grupo con una fila que pesa en 90, otra fila del grupo solo admite hasta 10; …
- [fidelity] REQ-09 (revisión visual dev): cuando un peso es inválido, el mensaje de error se muestra a ANCHO COMPLETO debajo de l…
- [edge] REQ-18 (adenda 7): Retirar una tributacion persistida con la "x" y volver a asignar la misma asignatura a la misma compet…
- [happy] REQ-01: Enviar 3 filas nuevas para (planId P1, matriz M1) crea 3 CompetencyAlignment y deja 1 sola entrada de historial …
- [happy] REQ-01: Reenviar el conjunto con 2 filas modificadas y 1 quitada deja exactamente las 2 filas modificadas: la quitada de…
- [error] REQ-01: Si la fila 3 de 5 viola R-2 (nivel no perteneciente a la competencia), la mutación falla y ninguna de las 5 fila…
- [error] REQ-01 (adenda 7, RBAC por operacion): Un usuario sin permiso de delete sobre CompetencyAlignment que guarda un conjunto…
- [edge] REQ-01: El planId enviado por el cliente en el payload se ignora: se deriva server-side desde la matriz/plan y el registr…
- [boundary] REQ-01: Un payload con 0 filas para (P1, M1) retira todas las tributaciones de ese scope y deja las de otras matrices…
- [happy] REQ-02: Con P1 que adoptó M1 y M2, guardar el conjunto de M1 deja intactas en cantidad e ids todas las filas cuyo compet…
- [edge] REQ-02: Una fila de (P1, M1) marcada como fuera de diseño que no viene en el payload sigue existiendo tras el guardado y …
- [edge] REQ-02: Una fila de otro plan P2 sobre la misma competencia de M1 no se toca al guardar el conjunto de P1.
- [error] REQ-02: Si el payload trae un competencyNodeId que no pertenece a la matriz enviada, la mutación falla con error de scop…
- [regression] REQ-02: El competencyAlignmentView devuelve, tras el batch, exactamente el mismo conjunto que se envió para (P1, M1…
- [happy] REQ-03: Guardar una fila Evaluates con contributionPercentage "33.33" persiste exactamente 33.33 y el view lo devuelve c…
- [boundary] REQ-03: "0" y "100" se aceptan; "100.01" y "-0.01" se rechazan con error de validación y la transacción completa no e…
- [boundary] REQ-03: "12.34" se acepta y "12.345" se rechaza por exceder 2 decimales.
- [edge] REQ-03: Omitir contributionPercentage en una fila Evaluates persiste null (la columna sigue nullable) y no rompe el batch…
- [error] REQ-03: Enviar contributionPercentage como texto no numérico ("abc") produce error de validación de la fila, identifican…
- [happy] REQ-04: Fila Both con "50" y fila Evaluates con "50" en el mismo grupo se guardan ambas con su peso.
- [error] REQ-04: Fila Develops con contributionPercentage "20" es rechazada por el validador con mensaje de R-6 y aborta el batch…
- [edge] REQ-04: Fila Develops sin peso se guarda con contributionPercentage null.
- [edge] REQ-04: Cambiar una fila de Evaluates a Develops en el mismo batch limpia su peso a null en la persistencia.
- [boundary] REQ-04: Dos filas del mismo (planId, competencyNodeId, developmentLevelId) con distinta asignatura conviven y cada un…
- [happy] REQ-05: Grupo con 4 filas que pesan: repartir deja 25.00 en cada una y la suma es 100.
- [boundary] REQ-05: Grupo con 3 filas: repartir deja 33.33 / 33.33 / 33.34 (o equivalente con residuo asignado a una sola fila) y…
- [edge] REQ-05: Grupo con 1 sola fila que pesa: repartir deja 100.
- [edge] REQ-05: Grupo con filas Develops mezcladas: el reparto ignora las Develops y solo reparte entre Evaluates/Both.
- [error] REQ-05: Grupo sin ninguna fila Evaluates/Both: la acción queda deshabilitada y no altera ningún valor.
- [fidelity] REQ-05: La acción se muestra en el grupo con el texto de "Repartir en partes iguales" resuelto por $t() contra lang/ …
- [happy] REQ-06: Tras "Repartir en partes iguales" en un grupo de 4, el grupo se muestra como automático sin haber escrito nada d…
- [edge] REQ-06: Editar una fila de 25.00 a 30.00 cambia el estado mostrado a manual en la misma interacción, sin llamada al backe…
- [edge] REQ-06: Recargar la vista sobre datos con pesos 25/25/25/25 vuelve a mostrar automático (el estado se recalcula desde los…
- [regression] REQ-06: El payload del batch para ese grupo no contiene ninguna propiedad de estado auto/manual y el schema de Comp…
- [happy] REQ-07: Aplicar (nivel Introduce, tipo Evaluates) a 10 asignaturas válidas crea 10 filas y el resultado reporta 10 aplic…
- [edge] REQ-07: De 10 asignaturas, 3 ya tienen esa tributación: el resultado reporta 7 aplicadas y 3 salteadas con motivo de dupl…
- [error] REQ-07: Si una asignatura no pertenece al plan, se reporta salteada con ese motivo y las demás sí se aplican (el reporte…
- [error] REQ-07: Si falla la escritura de un trozo por error de base, la operación completa se revierte y no queda ninguna fila d…
- [boundary] REQ-07: Un lote de 200 asignaturas se procesa en trozos acotados (tamaño de trozo constante, no O(filas) en una sola …
- [fidelity] REQ-07: El panel de resultado lista las salteadas con su motivo por $t() (una línea por asignatura con código y nombr…
- [happy] REQ-08: Un plan con asignaturas en períodos 1..8 se dibuja en 8 columnas, cada una con sus asignaturas ordenadas por pos…
- [edge] REQ-08: Una asignatura sin período se agrupa en un bloque de sin período y no rompe el render ni se pierde de la vista.
- [fidelity] REQ-08: En modo Por malla el panel lateral muestra las competencias de la matriz (no las asignaturas del plan), con s…
- [fidelity] REQ-08: Cada asignatura sin tributación en la vista muestra el estado vacío con el copy de "Sin tributar" definido en…
- [fidelity] REQ-08: Cada tributación se muestra como chip con nivel (I/R/M) y tipo (D/E/A) según la maqueta, con las etiquetas po…
- [regression] REQ-08: Grep en curriculum-mapping no encuentra ningún import desde curriculum-design ni referencia a CurriculumMes…
- [happy] REQ-09: Celda con 3 asignaturas Evaluates: se ven 3 inputs de peso independientes y editar uno no altera los otros.
- [edge] REQ-09: Celda con 2 Evaluates y 1 Develops: se ven 2 inputs de peso y la fila Develops no tiene input.
- [boundary] REQ-09: Escribir 100.5 en un input muestra el error de validación de rango en la propia fila y el botón de guardar qu…
- [fidelity] REQ-09: El input de peso usa el atom Input del layout-library con su sufijo de porcentaje y label por $t(), sin <inpu…
- [fidelity] REQ-09: El indicador de estado del grupo se muestra como badge con el texto de automático o manual resuelto por $t(),…
- [fidelity] REQ-10: En solo lectura modo Por competencia tampoco existe el selector de asignatura en el DOM.
- [edge] REQ-10: Quitar el selector no deja keys de i18n huérfanas ni referencias muertas al handler de cambio de asignatura en la…
- [happy] REQ-11: Editar una tributación en modo Por competencia, cambiar a Por malla y guardar produce una única llamada a la mut…
- [edge] REQ-11: Cambios hechos en un modo son visibles sin guardar al cambiar al otro modo (misma sesión Guardar/Descartar en mem…
- [edge] REQ-11: "Descartar" en cualquiera de los dos modos devuelve el conjunto al estado del último guardado y no emite mutación…
- [regression] REQ-11: Grep en el mod no encuentra llamadas a create/update/delete generic de CompetencyAlignment desde los compon…
- [happy] REQ-12: El test de paridad enumera contributionPercentage entre los campos gobernados de CompetencyAlignment y falla si …
- [edge] REQ-12: El test deja asentado con aserción explícita el hueco actual de la vía genérica sobre contributionPercentage, de …
- [regression] REQ-12: La suite de curriculum-mapping corre completa en verde tras la extensión, incluidos los tests de 1756 y com…
- [happy] REQ-13: En el editor, modo por competencia, se monta PlanSubjectsPanel con las asignaturas del plan y al seleccionar una…
- [happy] REQ-13: Con una asignatura en mano, marcar una celda competencia x nivel crea la tributacion de esa asignatura y no de o…
- [happy] REQ-13: En el editor, modo por malla, el panel de seleccion es la matriz de competencias y la seleccion define la compet…
- [error] REQ-13: Sin seleccion en el panel, marcar una celda no crea ninguna tributacion y avisa que falta elegir la asignatura.
- [regression] REQ-13: PlanSubjectsPanel no se monta en la vista solo lectura.
- [happy] REQ-14: El arbol montado del editor contiene panel de seleccion, CompetencyAlignmentGridTable y CompetencyAlignmentDetai…
- [happy] REQ-16: Con un elemento en mano, hacer click en "+ Asignar aca" de una celda destino crea la tributacion en esa celda.
- [edge] REQ-16: Hacer click sobre el elemento ya seleccionado en el panel lateral lo suelta: desaparece el chip "EN MANO" y los "…
- [error] REQ-16: Sin nada en mano, el "+" no es accionable y el shell muestra el aviso "selecciona una asignatura/competencia"; n…
- [regression] REQ-16: Busqueda en el codigo del editor y en los casos de prueba: no aparece draggable, dragstart/dragover/drop ni…
- [happy] REQ-16: Con un elemento en mano ya tributado en otra celda, el click en "+ Asignar aca" de un destino distinto mueve la …
- [happy] REQ-17: Elegir una competencia en el panel "COMPETENCIAS DE LA MATRIZ" muestra el chip "EN MANO · <competencia>" y habil…
- [edge] REQ-17: Sin nivel elegido en el selector "Nivel de desarrollo con que se va a asignar", el "+ Asignar aca" no crea la tri…
- [happy] REQ-17: "Varias" en una card abre la via masiva (REQ-07) y no asigna la competencia en mano de a una.
- [regression] REQ-17: La asignacion por malla no usa arrastre: el unico camino individual es competencia en mano + click en "+ As…
- [happy] REQ-18: Asignar una tributacion en el modo por competencia actualiza la grilla y el estado dirty del shell sin disparar …
- [happy] REQ-18: Cambiar el tipo de contribucion y el peso desde el CompetencyAlignmentDetailModal en el modo por malla modifica …
- [edge] REQ-18: Retirar una tributacion recien creada en el borrador la elimina del borrador y, al Guardar, no aparece ni como al…
- [regression] REQ-18: Repartir en partes iguales y el tope dinamico de peso (Adenda 2) siguen funcionando igual, operando sobre l…
- [error] REQ-18: No queda en el codigo del editor ninguna llamada de guardado per-field (mutacion por campo) para asignar/mover/r…
- [happy] REQ-19: Con varios cambios pendientes, "Guardar" emite exactamente una llamada a upsertCompetencyAlignmentSetValidated c…
- [happy] REQ-19: Partiendo del mismo estado de datos, la secuencia equivalente de cambios hecha en el modo por competencia y en e…
- [error] REQ-19: Si upsertCompetencyAlignmentSetValidated falla (p.ej. una fila viola R-1..R-5/R-10), no se persiste ningun cambi…
- [happy] REQ-19: "Descartar" devuelve la grilla y el modelo al ultimo estado guardado y deja el editor sin cambios pendientes.
- [boundary] REQ-19: Sin cambios pendientes, "Guardar" y "Descartar" estan deshabilitados y no emiten mutacion alguna.
- [edge] REQ-20: Con el borrador dirty, cambiar de matriz muestra la confirmacion; al cancelar, la matriz seleccionada y el borrad…
- [boundary] REQ-20: Sin cambios pendientes, salir del editor o cambiar de matriz no muestra aviso alguno.
- [happy] REQ-21: Al abrir "Varias" desde la card de la asignatura MAT-101, el modal muestra el subtitulo "Se asociaran a MAT-101 …
- [edge] REQ-21: Una competencia que la asignatura ya tributa aparece tildada, en gris, con la etiqueta "Ya tributa", su checkbox …
- [happy] REQ-21: Con 3 competencias nuevas marcadas el contador muestra "3 seleccionado(s)" aunque la asignatura ya tribute otras…
- [edge] REQ-21: El buscador filtra por codigo, por nombre de competencia y por nombre de matriz; "Todos" marca solo las competenc…
- [regression] REQ-21: El modal no lee ni depende de la competencia "en mano" del panel lateral: con el panel sin seleccion el mod…
- [happy] REQ-22: Con 2 competencias nuevas marcadas, "Asociar" agrega 2 filas al borrador y marca dirty sin emitir ninguna llamad…
- [happy] REQ-22: Tras "Asociar" y luego "Guardar Tributacion" se emite una unica llamada a upsertCompetencyAlignmentSetValidated …
- [edge] REQ-22: Tras "Asociar" sin guardar, al reabrir el modal para la misma asignatura las competencias recien agregadas aparec…
- [regression] REQ-22: Con cambios pendientes en el borrador, abrir el modal desde "Varias" no muestra ninguna confirmacion de "de…
- [regression] REQ-22: Aplicar "Asociar" no dispara loadView ni re-baseline del snapshot: los cambios previos del borrador siguen …
- [error] REQ-22: Si el upsert de conjunto rechaza por una regla R-1..R-5/R-10 de una fila agregada por el modal, no se persiste n…
- [happy] REQ-23: En una fila de peso con codigo y nombre de asignatura, la etiqueta renderiza el codigo y el nombre en dos elemen…
- [edge] REQ-23: En una fila de peso cuya asignatura no tiene nombre, la etiqueta muestra unicamente el codigo en una sola linea, …
- [fidelity] REQ-23: El input de % de cada fila queda alineado verticalmente con su etiqueta de dos lineas y su aria-label es "cod…
- [happy] REQ-24: El boton "Varias" de la fila de la competencia CEE1 abre el modal masivo con subtitulo "Se asociaran a CEE1 · <n…
- [edge] REQ-24: Una asignatura que ya tributa esa competencia (en cualquier nivel, segun el borrador) aparece tildada, deshabilit…
- [happy] REQ-24: El checkbox de grupo de un periodo marca solo las asignaturas seleccionables de ese periodo y deja intactas las …
- [happy] REQ-24: Con 2 asignaturas marcadas, "Asociar" agrega exactamente 2 filas al borrador con el nivel de desarrollo y el tip…
- [edge] REQ-24: El selector de Nivel de desarrollo del modal ofrece unicamente los niveles que declara la competencia destino, co…
- [regression] REQ-24: En la vista de solo lectura y en las competencias que consolidan, el boton "Varias" no se renderiza.
- [regression] REQ-24: La via "Agregar competencias" del modo malla conserva su comportamiento: destino fijo = asignatura, compete…

## Alcance de esta corrida
whole_ticket: el ticket completo (todas sus sesiones), juzgado antes de push/PR.