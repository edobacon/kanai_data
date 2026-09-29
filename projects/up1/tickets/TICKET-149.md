---
id: TICKET-149
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1770
module: curriculum-mapping
autopilot: manual
story_points:
  estimated: 5
  executed: 8
---

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

## Enmiendas post-cierre

### Enmienda post-cierre 1 - 2026-09-24 - Eduardo (dev)

**Origen**: revisión del PR (PR curriculum-mapping #41; kb/sp11/UPONE-1770-adendas-post-review-cm41.md)
**Motivo**: Correcciones de la revisión del PR curriculum-mapping #41 (veredicto iterar: un hallazgo alto y seis medios), aplicadas con los tickets ya cerrados.

**Cambios**:
- Mover de nivel quita el peso y avisa al usuario, en los tres caminos (Asignar acá en ambos modos y nivel del modal de detalle)
- Permisos en dos pasos: chequeo previo a leer (crear, modificar o eliminar) con denegación auditada, y chequeos por operación con el contexto fuera de la transacción
- Retiro solo de lo conocido: el servidor retira únicamente los ids que el editor cargó (knownIds); sin knownIds no retira nada
- El mensaje del tope de filas ya no sugiere dividir el guardado en tandas
- Historial de retiros completo: fila entera (asignatura, competencia, nivel, tipo y peso) y plan del guardado
- Cambio de matriz sin carreras: se descarta la respuesta tardía de la matriz anterior y el selector queda bloqueado al guardar
- Agregar competencias saltea las que no declaran el nivel elegido y avisa cuántas quedaron afuera
- La opción Varias solo se ofrece a quien puede crear
- Nivel efectivo: una edición sin nivel conserva el guardado y la regla de nivel declarado se valida sobre ese nivel
- Vía masiva: una falla de base al validar el destino ya no se informa como salteo por regla; el plan de las asignaturas se lee en una sola consulta
- Menores: recarga fallida como aviso, error del peso accesible, comentarios y doc actualizados, identificadores internos retirados del código y de los nombres de tests

**Commits**: curriculum-mapping@d035a6f, curriculum-mapping@10cd440, curriculum-mapping@c1c57e8
**Evidencia**: typecheck pass · lint pass · tests 3059/3059 en verde · 21 tests nuevos en la tanda (declarada)
**Misma revisión, también en**: TICKET-151, TICKET-152
