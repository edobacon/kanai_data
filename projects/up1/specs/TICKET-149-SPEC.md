---
id: TICKET-149-SPEC
project: up1
ticket: TICKET-149
status: approved
---

# Tributación (UPONE-1770): guardado en conjunto, peso del eje 1, vía masiva y vista por malla

## Resumen ejecutivo

Se completa la captura de tributación sobre el CRUD de 1756: upsert de conjunto transaccional de CompetencyAlignment acotado a (planId, competencias de la matriz), contributionPercentage en la escritura gobernada con validación por fila y R-6, reparto en partes iguales y estado auto/manual derivados client-side, vía masiva troceada en backend con reporte de salteadas, vista "Por malla" interna de curriculum-mapping, fix del selector en la vista solo lectura y extensión del test de paridad MCP. NO se hace: guard de suma 100 al publicar (D1, cross-mod), indicadores/versionado (1771), outcomeAlignment (1772), migración de niveles (1773), R-9, ni import de CurriculumMesh de curriculum-design (M-26). Se verifica con: guardado todo o nada que no toca otras matrices adoptadas ni filas fuera de diseño, peso editable solo en filas Evaluates/Both, reparto que suma 100 en el grupo, vía masiva que lista las asignaturas salteadas con su motivo, ausencia del selector en solo lectura, CRUD de 1756 verde y sync/codegen sin drift. Tamaño: 4 sesiones (dentro del techo), ~10 a 12 h. ADVERTENCIA (fuera de alcance, no se implementa): la maqueta muestra el estado final de toda la función (1756 + 1770 + 1771), por lo que los tres indicadores de cabecera, el modal de detalle en solo lectura y el pill de matriz adoptada quedan como están; tampoco se toca la vía genérica de MCP (solo el test que documenta el hueco).

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
## Tasks

#### S1.T1 — Agregar contributionPercentage a WRITABLE_FIELDS y a la validación por fila en curriculum-mapping/logic/helpers/validateCompetencyAlignment.js: porcentaje en [0,100], máximo 2 decimales, transportado como string y sin truncar. Reusar el criterio de precisión ya vigente del módulo (isValidWeight/hasWeightPrecision de validateCompetencyTree.js, RULE-1758) en lugar de escribir uno nuevo. Validación: unit test del helper + npm run sync sin drift.
Contrato: rollback: git checkout de logic/helpers/validateCompetencyAlignment.js y re-ejecutar npm run sync para restaurar el artefacto copiado a core.. Status: done

#### S1.T2 — Implementar R-6 en el mismo validador: tipo Develops obliga contributionPercentage null (rechaza cualquier valor), Evaluates/Both lo admiten; dejar explícito el grupo (planId, competencyNodeId, developmentLevelId) como clave de agrupación del peso, alineado al índice compuesto de 1769. Validación: unit tests de los tres tipos.
Contrato: rollback: git checkout del helper; el índice de 1769 no se toca, así que no hay migración que revertir.. Status: done

#### S1.T3 — Tests unitarios del validador de peso: rango, precisión, no truncado, R-6 por tipo y mensajes de error por fila con índice identificable. Reporte de suites con totales y clasificación introducido vs preexistente.
Contrato: rollback: git checkout de los archivos de test agregados en curriculum-mapping/tests/unit/.. Status: done

#### S2.T1 — Construir la mutación de upsert de conjunto de CompetencyAlignment acotada a (planId, matriz), siguiendo competencyTree-upsert.resolver.js y el RBAC restituido estilo planEntry-batch (no delega en el generic). Objetivo de la task; se completa solo con sus subtasks.
Contrato: rollback: Eliminar el par resolver + .schema.graphql nuevo y re-ejecutar npm run sync; la UI sigue usando la vía anterior hasta la sesión 4.. Status: done

#### S2.T1.1 — Crear el par resolver + schema en curriculum-mapping/logic/: const exportada con la palabra Mutation en el nombre (RULE-mods-004), archivo .schema.graphql companion con el mismo basename (RULE-mods-002) usando extend type Mutation (RULE-mods-006). Validación: el server arranca y la mutación aparece en el schema tras sync.
Contrato: rollback: Borrar ambos archivos y correr npm run sync.. Status: done

#### S2.T1.2 — Implementar el cuerpo transaccional con runInTransaction: derivar planId server-side, correr R-1..R-5/R-10 por fila reusando validateCompetencyAlignment, y abortar todo el conjunto ante la primera violación. Validación: test de integración de rollback total.
Contrato: rollback: git checkout del resolver.. Status: done

#### S2.T1.3 — Implementar el scope de retiro: seleccionar las filas existentes por planId + competencyNodeId perteneciente a las competencias de la matriz (mismo filtro que alignmentView.resolver.js:293), retirar solo las de ese scope que no vinieron en el payload, y excluir del retiro las filas marcadas fuera de diseño (R-12). Rechazar payloads con competencyNodeId ajeno a la matriz.
Contrato: rollback: git checkout del resolver; ningún dato migrado que revertir (el batch no corrió en producción).. Status: done

#### S2.T1.4 — RBAC propio que exige create+modify+delete sobre CompetencyAlignment y registro de una sola entrada de historial por operación de conjunto. Validación: test con usuario sin delete que recibe error de autorización.
Contrato: rollback: git checkout del resolver.. Status: done

#### S2.T1.5 — Dimensionamiento: acotar el batch con tamaño máximo de conjunto por llamada y escrituras agrupadas dentro de la transacción (no una sentencia por fila en bucle abierto). Validación: guardado de un conjunto de 300 filas dentro del presupuesto de tiempo, sin timeout.
Contrato: rollback: git checkout del resolver.. Status: done

#### S2.T2 — Correr npm run sync y codegen, verificar cero drift y que los artefactos de sync no queden commiteados (RULE-mods-001/003). Reportar los archivos copiados a core que quedan fuera del commit.
Contrato: rollback: git checkout de los workspaces de core alcanzados por el sync y re-ejecutar sync desde el mod fuente.. Status: done

#### S2.T3 — Tests de integración del batch: creación, reemplazo, retiro dentro del scope, no interferencia con otra matriz adoptada ni con filas fuera de diseño, rollback total ante fila inválida, planId derivado server-side, una sola entrada de historial y RBAC incompleto. Incluye regresión del CRUD de 1756.
Contrato: rollback: git checkout de los tests agregados en curriculum-mapping/tests/integration/.. Status: done

#### S3.T1 — Quitar el selector de asignatura de la vista solo lectura en sus dos modos (por asignatura y por competencia), dejando el selector de matriz y el botón "Tributar" intactos; limpiar el handler y las keys de i18n que quedan huérfanas, sin tocar el editor. Objetivo de la task; se completa solo con sus subtasks.
Contrato: rollback: git checkout del componente de la vista solo lectura y de los archivos de lang del mod, y correr npm run sync.. Status: done

#### S3.T1.1 — Análisis de impacto previo: grep del selector de asignatura, de su handler de cambio y de sus keys de i18n en todo el mod, separando los usos de la vista solo lectura de los del editor (que se conservan). Reportar la lista de archivos alcanzados antes de editar; si el selector es un componente compartido entre solo lectura y editor, dejar asentado que se quita por composición (prop/flag en el consumidor de solo lectura), no borrando el componente.
Contrato: rollback: Sin cambios en código: es una task de lectura.. Status: done

#### S3.T1.2 — Quitar el selector de asignatura del modo Por asignatura de la vista solo lectura, dejando intactos en la cabecera el selector de matriz y el botón "Tributar". Validación: el DOM del modo no contiene el selector y la cabecera conserva los otros dos controles.
Contrato: rollback: git checkout del componente de la vista solo lectura.. Status: done

#### S3.T1.3 — Quitar el selector de asignatura del modo Por competencia de la vista solo lectura, verificando que el modo sigue renderizando su contenido con la asignatura resuelta por el contexto (sin depender del selector removido). Validación: el DOM del modo no contiene el selector y la vista carga sin errores de consola.
Contrato: rollback: git checkout del componente de la vista solo lectura.. Status: done

#### S3.T1.4 — Limpiar el código muerto que deja el retiro en la vista solo lectura: handler de cambio de asignatura, estado/ref asociado y cualquier query o computed que solo alimentaba al selector; sin tocar los equivalentes del editor.
Contrato: rollback: git checkout del componente de la vista solo lectura.. Status: done

#### S3.T1.5 — Quitar de lang/{locale}.json del mod las keys de i18n que quedan sin consumidor tras el retiro (solo las exclusivas de la vista solo lectura, verificadas por grep contra el editor), respetando el formato plano bajo object.* (RULE-mods-011), y correr npm run sync verificando cero drift.
Contrato: rollback: git checkout de los archivos de lang del mod y re-sync.. Status: done

#### S3.T2 — Separar las dos superficies: dejar la pestana "Tributacion" del plan como solo lectura sin selector de asignatura y con el boton "Tributar", y que el editor sea la pantalla destino compuesta por panel de seleccion + CompetencyAlignmentGridTable + CompetencyAlignmentDetailModal, sin compartir la barra de acciones de solo lectura.
Contrato: rollback: git revert del commit de la task: vuelve la composicion anterior (selector y grilla mezclados en la pestana); solo cambia routing y composicion de UI, sin efectos en el store ni en la DB.. Status: done

#### S3.T3 — Montar el panel lateral de SELECCION en el editor: reutilizar PlanSubjectsPanel en el modo por competencia y la matriz de competencias en el modo por malla, con estado de "entidad en mano" que la grilla consume al tributar una celda.
Contrato: rollback: git revert del commit de la task: el editor queda sin panel de seleccion (estado previo a la enmienda); no hay cambios de esquema ni de datos que revertir.. Status: done

#### S3.T4 — Implementar en CompetencyAlignmentGridTable el mecanismo de asignacion por SELECCION + CLICK: elemento en mano con chip "EN MANO · <elemento>" y "x" para soltar, "+ Asignar aca" habilitado en los destinos validos solo con algo en mano, "+" atenuado y aviso "selecciona una asignatura/competencia" cuando no hay nada en mano. Sin draggable ni handlers de arrastre.
Contrato: rollback: Revertir el commit del mecanismo de seleccion + click en CompetencyAlignmentGridTable; la grilla vuelve al estado previo de asignacion.. Status: done

#### S3.T5 — Extender CompetencyAlignmentDetailModal (modsComponents/CompetencyAlignmentGrid/) en su estado SOLO LECTURA segun la decision A: muestra asignatura, competencia a la que tributa, nivel de desarrollo, tipo de contribucion con su glosa y matriz de competencia, y su pie tiene UNICAMENTE la accion "Listo". NO se agrega un boton "Editar en tributacion": en up1 se pasa a edicion por el modo global del registro (modo edicion de la pantalla), no desde el modal. El estado EDICION conserva el control segmentado de nivel de desarrollo (limitado a los niveles que la competencia declara), el control segmentado de tipo de contribucion, el bloque de peso (REQ-05) y las acciones "Retirar tributacion" y "Listo". Sin panel lateral de detalle ni componente de detalle paralelo (REQ-09).
Contrato: rollback: Revertir los cambios del archivo CompetencyAlignmentDetailModal.ts/vue al commit previo (git checkout del archivo); no hay migracion ni dato persistido involucrado.. Status: done

#### S3.T6 — Extender CompetencyAlignmentDetailModal con el estado EDICION de la maqueta: segmentados de nivel (limitado a los niveles que declara la competencia) y de tipo, bloque "Peso dentro de <nivel>" con input %, badge "REPARTO AUTOMATICO", indicador "<N> evalua · suma <S>%" y accion "Repartir en partes iguales"; pie con "Retirar tributacion" + "Listo". Las filas Desarrolla no exponen campo de peso (R-6).
Contrato: rollback: Revertir el commit del bloque de peso y de los segmentados en CompetencyAlignmentDetailModal; el modal queda sin edicion de peso y el resto del editor sigue funcionando.. Status: done

#### S3.T7 — Peso por fila, reparto y estado derivado en el editor. Objetivo de la task; se completa solo con sus subtasks.
Contrato: rollback: git checkout de los componentes y del helper agregados en el mod, borrar las keys de lang nuevas y correr npm run sync.. Status: done

#### S3.T7.1 — Crear el helper puro weights.ts en los shared composables del mod (pure functions/constants, sin refs ni Apollo, RULE-mods-005): reparto de 100 entre las filas que pesan del grupo con 2 decimales y residuo asignado para que la suma sea exacta, más la derivación del estado automático/manual a partir de los pesos.
Contrato: rollback: Borrar weights.ts y correr npm run sync.. Status: done

#### S3.T7.2 — Agregar las keys de i18n del peso, el reparto y el estado en lang/{locale}.json del mod respetando el formato plano bajo object.* (RULE-mods-011), y correr npm run sync.
Contrato: rollback: git checkout de los archivos de lang del mod y re-sync.. Status: done

#### S3.T8 — Test de componente de CompetencyAlignmentDetailModal: en estado SOLO LECTURA verificar que el pie expone SOLO el boton "Listo" y que NO existe un boton "Editar en tributacion" (assert de ausencia), ademas de que se rendericen asignatura, competencia, nivel de desarrollo, tipo de contribucion con glosa y matriz; en estado EDICION verificar los controles segmentados de nivel y tipo, el bloque de peso y las acciones "Retirar tributacion" y "Listo". El test debe fallar si reaparece el boton "Editar en tributacion" en solo lectura (decision A, criterio de gate de S3).
Contrato: rollback: Revertir el archivo de test al commit previo (git checkout del spec); no toca codigo de produccion.. Status: done

#### S3.T9 — Test de interaccion del editor: con elemento en mano el click en "+ Asignar aca" crea o mueve la tributacion; el click sobre el elemento ya elegido lo suelta; sin nada en mano el "+" queda atenuado y aparece el aviso. Incluye la asercion de regresion de que no existen atributos ni handlers de arrastre en la grilla.
Contrato: rollback: Borrar el archivo de test agregado; no afecta codigo de produccion.. Status: done

#### S4.T1 — Implementar el panel lateral "COMPETENCIAS DE LA MATRIZ" del modo por malla: lista de competencias de la matriz, competencia en mano con chip y "x", y selector "Nivel de desarrollo con que se va a asignar" que condiciona la asignacion.
Contrato: rollback: Revertir el commit del panel de competencias; el modo por malla queda sin panel de seleccion propio y el modo por competencia sigue con PlanSubjectsPanel.. Status: done

#### S4.T2 — Dibujar las cards de asignatura por periodo del modo por malla (period/position de planEntry) con "+ Asignar aca" cuando hay competencia en mano, chip de tributacion y confirmacion tras asignar, y accion "Varias" que abre la via masiva. Reusando CompetencyAlignmentGridTable, sin importar CurriculumMesh de curriculum-design (M-26).
Contrato: rollback: Revertir el commit de las cards por periodo; la vista por malla deja de ofrecer asignacion y el modo por competencia queda intacto.. Status: done

#### S4.T3 — Unificar la grilla de ambos modos del editor sobre la CompetencyAlignmentGridTable existente (extendiendola con el modo por malla: asignaturas por periodo ordenadas por position desde planEntry), borrar cualquier componente paralelo creado en el ticket y verificar que ambos modos emiten el mismo payload de batch para (planId, matriz).
Contrato: rollback: git revert del commit de la task: la grilla vuelve a su version previa y el modo por malla deja de estar disponible; el batch del backend no se toca, por lo que el guardado del modo por competencia sigue operativo.. Status: done

#### S4.T4 — Vista "Por malla" en el editor y unificación de la vía de guardado. Objetivo de la task; se completa solo con sus subtasks.
Contrato: rollback: Revertir el toggle de modo y el componente de malla; el editor queda solo con el modo Por competencia, que sigue guardando por el batch.. Status: done

#### S4.T4.1 — Toggle de modo (Por competencia / Por malla) en el editor, con el estado de la sesión Guardar/Descartar compartido entre ambos modos (los cambios no guardados sobreviven al cambio de modo).
Contrato: rollback: Quitar el toggle y dejar el modo por competencia fijo.. Status: done

#### S4.T4.2 — Cablear el guardado de ambos modos a la mutación de batch de la sesión 2: un único payload con el conjunto completo del (planId, matriz) y una sola llamada por guardado; verificar por grep que no queda ninguna llamada al CRUD generic de CompetencyAlignment en los componentes.
Contrato: rollback: Volver a apuntar el guardado a la vía anterior revirtiendo el composable de API del editor.. Status: done

#### S4.T5 — Test del modo por malla: panel "COMPETENCIAS DE LA MATRIZ" pone la competencia en mano, el selector de nivel condiciona la asignacion, la card muestra "+ Asignar aca" y tras asignar queda con su chip y confirmacion, y "Varias" abre la via masiva en lugar de asignar de a una.
Contrato: rollback: Borrar el archivo de test agregado; no afecta codigo de produccion.. Status: done

#### S4.T6 — Tests y regresión de cierre: unit del helper weights.ts (reparto de 3, 4 y 1 fila, estado derivado), tests de componente para la ausencia del selector en solo lectura y su presencia en el editor, agrupación por período incluido el caso sin período, guardado único por batch desde ambos modos, suite completa de curriculum-mapping con el CRUD de 1756 en verde, npm run sync y codegen sin drift y artefactos de sync fuera del commit. Objetivo de la task; se completa solo con sus subtasks.
Contrato: rollback: git checkout de los tests agregados; si el sync dejó drift, restaurar los workspaces de core desde HEAD y re-sync desde el mod fuente.. Status: done

#### S4.T6.1 — Unit tests del helper weights.ts: reparto en grupos de 1, 3 y 4 filas que pesan con suma exacta 100 y residuo asignado, exclusión de las filas Develops del reparto, grupo sin filas que pesan, y derivación del estado automático/manual (incluye el caso 25/25/25/25 que vuelve a dar automático tras recarga).
Contrato: rollback: git checkout de los tests unitarios agregados.. Status: done

#### S4.T6.2 — Tests de componente del peso en el editor: inputs independientes por fila Evaluates/Both, ausencia de input en filas Develops, error de rango en la propia fila con guardado deshabilitado ante 100.5, y badge de estado que pasa a manual al editar un valor sin llamada al backend.
Contrato: rollback: git checkout de los tests de componente agregados.. Status: done

#### S4.T6.3 — Tests de componente de la vista Por malla: agrupación por período con orden por position, bloque de asignaturas sin período, estado vacío "Sin tributar", panel lateral con las competencias de la matriz, y grep que confirma cero imports de curriculum-design y cero referencias a CurriculumMesh (M-26).
Contrato: rollback: git checkout de los tests agregados.. Status: done

#### S4.T6.4 — Tests de componente del selector: ausencia en los dos modos de la vista solo lectura, presencia y operatividad en los dos modos del editor, y verificación de que no quedan keys de i18n huérfanas ni referencias muertas al handler removido.
Contrato: rollback: git checkout de los tests agregados.. Status: done

#### S4.T6.5 — Test de la vía única de guardado: editar en Por competencia, cambiar a Por malla y guardar emite una sola llamada a la mutación de batch con el conjunto completo del (planId, matriz); los cambios sin guardar sobreviven al cambio de modo; "Descartar" restituye el último guardado sin emitir mutación; grep sin llamadas al CRUD generic desde los componentes del editor.
Contrato: rollback: git checkout de los tests agregados.. Status: done

#### S4.T6.6 — Corrida de cierre: suite completa de curriculum-mapping incluido el CRUD de 1756 y competencyAlignmentSchemaAdditions.test.js, más npm run sync y codegen con verificación de cero drift y de que los artefactos copiados a core quedan fuera del commit. Reporte con suites, totales (ejecutados/pasados/fallidos) y clasificación introducido vs preexistente vs hallazgo NO-bug.
Contrato: rollback: Si el sync dejó drift, restaurar los workspaces de core desde HEAD y re-sync desde el mod fuente.. Status: done

#### S5.T1 — Resolver de vía masiva: aplicar un destino (developmentLevelId + tipo) a N asignaturas en una transacción, con troceo en el backend siguiendo matrixAdoption.resolver.js:246-300, par resolver + .schema.graphql con extend type Mutation, y resultado tipado que devuelve aplicadas y salteadas con motivo por ítem (duplicado, fuera del plan/matriz, regla no cumplida). Validación: tests de lote mixto y de lote grande.
Contrato: rollback: Borrar el par resolver + schema y correr npm run sync; la UI de vía masiva queda sin montar.. Status: done

#### S5.T2 — UI de la vía masiva en el editor: selección de asignaturas, elección del destino y panel de resultado que lista las salteadas con código, nombre y motivo. Atoms del layout-library, sin literales (todo por $t() contra lang/ del mod), un solo .vue por carpeta de modsComponents (RULE-mods-011/014/015); CSS en css/3-component/ (RULE-mods-016).
Contrato: rollback: Borrar la carpeta del componente y sus keys de lang, correr npm run sync y touch suite/vueform.config.ts si aplica (RULE-mods-021).. Status: done

#### S5.T3 — Tests de la vía masiva y de paridad: lote válido, lote con duplicados, ítem fuera del plan, fallo de escritura con reversión total, lote de 200 con troceo sin timeout, y suite de paridad MCP completa. Reporte con totales y clasificación de fallos.
Contrato: rollback: git checkout de los tests agregados.. Status: done

#### S6.T1 — Extender el test de paridad MCP para cubrir contributionPercentage: aserta que el campo está en la vía gobernada y deja asentado el hueco actual de la vía genérica, de modo que el test deba actualizarse cuando se cierre con blockGenericMutation.
Contrato: rollback: git checkout del archivo de test de paridad.. Status: done

#### S6.T2 — Barrido de fidelidad: eliminar del codigo, copys y documentacion del editor toda mencion a drag, arrastrar, draggable o "equivalente por teclado", y a un panel lateral de detalle de tributacion; dejar la redaccion en terminos de seleccion + click y de CompetencyAlignmentDetailModal.
Contrato: rollback: Revertir el commit del barrido de copys y documentacion; no afecta comportamiento en runtime.. Status: done

#### S7.T1 — Tests de fidelidad de la UI nombrando los componentes reales: (a) el detalle y el peso se editan en CompetencyAlignmentDetailModal y no existe panel lateral de detalle; (b) PlanSubjectsPanel se monta solo en el editor, nunca en la pestana solo lectura; (c) ambos modos del editor usan CompetencyAlignmentGridTable y no existe CompetencyLevelGrid; (d) la pestana solo lectura no renderiza selector de asignatura y si el boton "Tributar".
Contrato: rollback: git revert del commit de la task: se quitan los tests agregados; no afecta codigo de produccion.. Status: done

#### S7.T2 — Modelar el BORRADOR en memoria del conjunto (planId, matriz) en el shell CompetencyAlignmentGridElement: snapshot del conjunto persistido al cargar la matriz, estructura de trabajo indexada por fila, dirty tracking derivado (comparacion contra el snapshot) y API interna (upsertRow/removeRow/setField/reset) que consumen ambos modos. Sin cambios de backend.
Contrato: rollback: Revertir el commit del shell; el editor vuelve al guardado inmediato per-field ya entregado en S3/S4.. Status: done

#### S7.T3 — Rewire de las acciones del modo POR COMPETENCIA (PlanSubjectsPanel + CompetencyAlignmentGridTable + CompetencyAlignmentDetailModal): asignar/mover/retirar (REQ-16), nivel de desarrollo, tipo de contribucion, peso, repartir en partes iguales y tope dinamico (Adenda 2) pasan a mutar el borrador; se elimina la persistencia per-field de performAssign y equivalentes.
Contrato: rollback: Revertir el commit; performAssign y los handlers per-field vuelven a persistir al instante.. Status: done

#### S7.T4 — Rewire de las acciones del modo POR MALLA (MatrixCompetenciesPanel + MatrixMeshView + el mismo CompetencyAlignmentDetailModal): "+ Asignar aca", retiro, nivel, tipo y peso pasan a mutar el mismo borrador del shell, garantizando que ambos modos comparten modelo y producen el mismo payload.
Contrato: rollback: Revertir el commit; MatrixMeshView vuelve a la vía per-field entregada en S4.. Status: done

#### S7.T5 — Implementar la barra de guardado accionable del editor: acciones "Guardar" (valida el borrador, serializa el conjunto completo de (planId, matriz) y commitea en una unica llamada a upsertCompetencyAlignmentSetValidated, manejo de error todo-o-nada conservando el borrador) y "Descartar" (revierte al ultimo snapshot guardado); ambas deshabilitadas sin cambios pendientes. Tras guardar con exito, refrescar el snapshot desde la respuesta/refetch de alignmentView.
Contrato: rollback: Revertir el commit; la barra desaparece y no se invoca la mutacion de conjunto desde el editor.. Status: done

#### S7.T6 — Aviso de cambios sin guardar: interceptar la salida del editor (volver a la pestana "Tributacion" / navegacion) y el cambio de matriz cuando el borrador esta dirty, con confirmacion continuar/cancelar; cancelar deja borrador y seleccion intactos.
Contrato: rollback: Revertir el commit; la salida y el cambio de matriz vuelven a ser directos.. Status: done

#### S7.T7 — Tests de componente del borrador y del guardado accionable: mutaciones del borrador sin red en ambos modos, Guardar emite una sola llamada a upsertCompetencyAlignmentSetValidated con el conjunto completo, fallo del backend = todo-o-nada con borrador conservado, Descartar revierte, Guardar/Descartar deshabilitados sin cambios, y aviso de cambios sin guardar al salir y al cambiar de matriz (incluido el caso sin cambios, sin aviso).
Contrato: rollback: Revertir el commit de tests.. Status: done

#### S7.T8 — Test de integracion de paridad de payload entre modos: aplicar la misma secuencia de cambios en el modo por competencia y en el modo por malla y verificar que el payload de batch de (planId, matriz) es identico y que el guardado usa la misma via gobernada; mas regresion de lo entregado en S3/S4 (CRUD de tributacion de 1756 verde, modal de detalle, reparto y tope de peso).
Contrato: rollback: Revertir el commit de tests.. Status: done

#### S8.T1 — Redisenar CompetencyAlignmentBulkApplyModal a "Agregar competencias": destino FIJO = la asignatura de la card que abre el modal (subtitulo "Se asociaran a <codigo> · <asignatura>"); la lista son las competencias HOJA de la(s) matriz(es) adoptada(s), agrupadas por matriz con contador por grupo; las que la asignatura ya tributa se muestran tildadas, en gris, con etiqueta "Ya tributa" y no seleccionables; solo se marcan las nuevas y el contador "N seleccionado(s)" cuenta solo esas; selectores de Nivel de desarrollo + Tipo de contribucion arriba (mismo enum fijo de contributionTypes.ts) aplicados a todo lo nuevo seleccionado; buscador por texto (codigo / competencia / matriz); botones "Todos"/"Ninguno"; boton de accion "Asociar". Quitar la dependencia de la competencia "en mano" y la lista de asignaturas de la semantica anterior.
Contrato: rollback: git checkout -- la ruta del modal CompetencyAlignmentBulkApplyModal.vue en modsComponents/CompetencyAlignmentGrid/ para restituir la version de S5 (lista de asignaturas + competencia en mano); no hay cambios de esquema ni de datos que revertir.. Status: done

#### S8.T2 — Integrar "Asociar" al BORRADOR en memoria: en competencyAlignmentDraft.logic.ts agregar N filas al borrador (una por competencia nueva, con el nivel+tipo elegidos) marcando dirty, sin persistir; derivar el estado "Ya tributa" del borrador y no del snapshot persistido. En el shell CompetencyAlignmentGridElement.vue eliminar el flujo inmediato de la via masiva: el guard de "descartar cambios sin guardar" al abrir (showBulkUnsavedConfirm / onConfirmBulkUnsaved), la mutation inmediata y el re-baseline por loadView en onBulkApply; la persistencia queda a cargo de "Guardar Tributacion" (upsertCompetencyAlignmentSetValidated). La mutation bulkApplyCompetencyAlignmentValidated queda sin uso desde el editor (no se elimina del backend).
Contrato: rollback: git checkout -- competencyAlignmentDraft.logic.ts y CompetencyAlignmentGridElement.vue para restituir el flujo inmediato de S5 (guard de descarte + mutation + loadView); la mutation de backend nunca se toco, asi que no requiere revertirse.. Status: done

#### S8.T3 — i18n en competencyAlignmentGrid.i18n.json para es/en/pt: agregar las claves de "Agregar competencias" (titulo, "Se asociaran a <codigo> · <asignatura>", "Ya tributa", "Asociar", placeholder del buscador, "Todos", "Ninguno", contador "N seleccionado(s)") y quitar las claves de la semantica vieja de la via masiva que queden sin uso (p.ej. subjectsLabel y el bloque de resultado con salteadas), verificando con grep que ninguna otra vista las consuma antes de borrarlas.
Contrato: rollback: git checkout -- competencyAlignmentGrid.i18n.json para restituir el set de claves de S5 en los tres idiomas.. Status: done

#### S8.T4 — Tests de componente del modal y del borrador: el modal lista competencias hoja agrupadas por matriz (no asignaturas) y muestra el subtitulo con la asignatura destino; las competencias ya tributadas aparecen con "Ya tributa" y no son seleccionables ni suman al contador; el buscador y "Todos"/"Ninguno" operan solo sobre las nuevas; "Asociar" agrega N filas al borrador y marca dirty sin llamar a la red; "Guardar Tributacion" persiste esas filas en una unica llamada a upsertCompetencyAlignmentSetValidated; abrir el modal con cambios pendientes no dispara el guard de descarte ni re-baseline. Actualizar o retirar los tests de S5 que afirmen la semantica vieja (competencia en mano -> N asignaturas, transaccion inmediata, panel de salteadas).
Contrato: rollback: git checkout -- los archivos de test tocados para restituir la suite de S5; sin efectos fuera de los specs.. Status: done

#### S9.T1 — Etiqueta de dos lineas en la fila de peso del CompetencyAlignmentDetailModal: renderizar el codigo de la asignatura en tamanio menor sobre el nombre, con fallback a solo codigo cuando falta el nombre, alineacion vertical centrada respecto del input de % y aria-label "codigo · nombre"; agregar el CSS correspondiente al bloque de peso existente.
Contrato: rollback: git checkout -- los archivos del CompetencyAlignmentDetailModal y su CSS; la fila vuelve a mostrar solo el codigo de la asignatura y el aria-label previo.. Status: done

#### S9.T2 — Generalizar CompetencyAlignmentBulkApplyModal a una asociacion masiva direccional con items genericos (id, codigo, nombre, grupo, ya-tributa): props de titulo/subtitulo, lista agrupada con contador y checkbox de grupo que opera solo sobre los seleccionables del grupo, buscador por codigo/nombre, "Todos"/"Ninguno" solo sobre las nuevas visibles, contador de nuevas y accion "Asociar" que emite los items elegidos; mantener el comportamiento actual de la via de malla "Agregar competencias" sobre el mismo componente, sin modal paralelo.
Contrato: rollback: git checkout -- CompetencyAlignmentBulkApplyModal y sus consumidores; el modal vuelve a su forma especifica de "Agregar competencias" del modo malla.. Status: done

#### S9.T3 — Boton "Varias" en la fila de competencia de CompetencyAlignmentGridTable (solo si la competencia es destino valido, es decir no consolida, y solo en modo edicion) + cableado en el shell CompetencyAlignmentGridElement: armar los items de asignaturas del plan agrupadas por periodo, derivar "ya tributa" desde el BORRADOR, acotar el selector de nivel a los niveles que declara la competencia (default el primero) y aplicar "Asociar" agregando N filas al borrador con nivel+tipo elegidos, marcando dirty sin llamada de red ni re-baseline.
Contrato: rollback: git checkout -- CompetencyAlignmentGridTable, el shell CompetencyAlignmentGridElement y la logica del borrador; el modo por competencia queda sin el boton "Varias" y sin la via masiva de asignaturas.. Status: done

#### S9.T4 — i18n es/en/pt de los textos nuevos de la via masiva "Agregar asignaturas": titulo, subtitulo "Se asociaran a <codigo> · <competencia>.", placeholder del buscador por codigo o nombre, encabezado "Periodo N" con contador, etiqueta "Ya tributa", glosas de nivel ("Con que profundidad la aborda.") y tipo ("Solo Evalua y Ambas generan evidencia de logro."), nota de aplicacion a todo lo seleccionado, contador "N seleccionado(s)" y acciones "Cancelar"/"Asociar".
Contrato: rollback: git checkout -- los archivos de i18n del mod; se pierden las keys nuevas y el modal vuelve a los textos previos.. Status: done

#### S9.T5 — Tests de componente/logica: REQ-23 (etiqueta de dos lineas con codigo y nombre, fallback sin nombre, aria-label "codigo · nombre") y REQ-24 (apertura del modal con destino fijo y subtitulo, agrupacion por periodo, "Ya tributa" derivado del borrador y excluido del contador, checkbox de grupo acotado a los seleccionables del periodo, "Asociar" agrega N filas al borrador sin red y habilita Guardar/Descartar, niveles acotados a los que declara la competencia, ausencia de "Varias" en solo lectura y en competencias que consolidan) + regresion de la via de malla "Agregar competencias" (REQ-21/REQ-22).
Contrato: rollback: git checkout -- los archivos de test agregados; se pierde la cobertura de REQ-23/REQ-24 y la regresion explicita de la via de malla.. Status: done
## Verificacion runtime

1. **Qué:** Smoke de la vista afectada por Tributación (UPONE-1770): guardado en conjunto, peso del eje 1, vía masiva y vista por malla
   - **Se debe ver:** La vista carga y responde sin errores.
   - **Dónde:** vista afectada por el ticket

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-05 (edit) `confirmed`: La accion "Repartir en partes iguales" vive dentro de CompetencyAlignmentDetailModal (no en un panel lateral) y distribuye 100 entre las fil
- REQ-08 (edit) `confirmed`: El editor de tributacion ofrece la vista "Por malla" reutilizando los componentes ya existentes de `modsComponents/CompetencyAlignmentGrid/`
- REQ-09 (edit) `confirmed`: El detalle de una tributacion y la edicion de su peso ocurren en un MODAL, CompetencyAlignmentDetailModal (construido sobre el Modal de @mol
- REQ-10 (edit) `confirmed`: La vista solo lectura de tributacion es la pestana "Tributacion" del plan: no muestra el selector de asignatura en ninguno de sus dos modos 
- REQ-11 (edit) `confirmed`: Las dos vistas del editor (por competencia y por malla) se dibujan con la misma CompetencyAlignmentGridTable y operan sobre la misma via gob
- REQ-13 (add) `confirmed`: El editor muestra un panel lateral de SELECCION que define la asignatura "en mano": en el modo por competencia se reutiliza PlanSubjectsPane
- REQ-14 (add) `confirmed`: Solo lectura y edicion son dos superficies distintas: (a) la pestana "Tributacion" del plan, de solo lectura, con el boton "Tributar" y sin 
- REQ-15 (add) `confirmed`: La implementacion de 1770 EXTIENDE los componentes ya existentes en `curriculum-mapping/modsComponents/CompetencyAlignmentGrid/` (Competency

**Tasks agregadas:**

- S4: Extender CompetencyAlignmentDetailModal (Modal de @molecules, v-model:open, boton "Listo") para que el detalle de la celda liste una fila por asignatura con el campo "Peso dentro de <nivel>" solo en Evaluates/Both, y mover ahi la accion "Repartir en partes iguales" apoyada en el helper puro weights.ts. Eliminar cualquier panel lateral de detalle introducido para esto. (valida: REQ-09, REQ-05; rollback: git revert del commit de la task: restaura CompetencyAlignmentDetailModal a su version previa a 1770; el editor vuelve a mostrar el detalle sin campo de peso y sin reparto, sin tocar backend ni datos.)
- S4: Montar el panel lateral de SELECCION en el editor: reutilizar PlanSubjectsPanel en el modo por competencia y la matriz de competencias en el modo por malla, con estado de "entidad en mano" que la grilla consume al tributar una celda. (valida: REQ-13; rollback: git revert del commit de la task: el editor queda sin panel de seleccion (estado previo a la enmienda); no hay cambios de esquema ni de datos que revertir.)
- S4: Separar las dos superficies: dejar la pestana "Tributacion" del plan como solo lectura sin selector de asignatura y con el boton "Tributar", y que el editor sea la pantalla destino compuesta por panel de seleccion + CompetencyAlignmentGridTable + CompetencyAlignmentDetailModal, sin compartir la barra de acciones de solo lectura. (valida: REQ-10, REQ-14; rollback: git revert del commit de la task: vuelve la composicion anterior (selector y grilla mezclados en la pestana); solo cambia routing y composicion de UI, sin efectos en el store ni en la DB.)
- S4: Unificar la grilla de ambos modos del editor sobre la CompetencyAlignmentGridTable existente (extendiendola con el modo por malla: asignaturas por periodo ordenadas por position desde planEntry), borrar cualquier componente paralelo creado en el ticket y verificar que ambos modos emiten el mismo payload de batch para (planId, matriz). (valida: REQ-08, REQ-11, REQ-15; rollback: git revert del commit de la task: la grilla vuelve a su version previa y el modo por malla deja de estar disponible; el batch del backend no se toca, por lo que el guardado del modo por competencia sigue operativo.)
- S5: Tests de fidelidad de la UI nombrando los componentes reales: (a) el detalle y el peso se editan en CompetencyAlignmentDetailModal y no existe panel lateral de detalle; (b) PlanSubjectsPanel se monta solo en el editor, nunca en la pestana solo lectura; (c) ambos modos del editor usan CompetencyAlignmentGridTable y no existe CompetencyLevelGrid; (d) la pestana solo lectura no renderiza selector de asignatura y si el boton "Tributar". (valida: REQ-09, REQ-10, REQ-13, REQ-14, REQ-15, test; rollback: git revert del commit de la task: se quitan los tests agregados; no afecta codigo de produccion.)

### Enmienda 2
**REQs:**

- REQ-09 (edit) `confirmed`: El detalle de una tributacion vive en el CompetencyAlignmentDetailModal YA EXISTENTE en modsComponents/CompetencyAlignmentGrid/ (Modal de @m
- REQ-05 (edit) `confirmed`: Dentro del CompetencyAlignmentDetailModal en modo edicion, el bloque de peso "Peso dentro de <nivel>" ofrece un input con sufijo %, el badge
- REQ-06 (edit) `confirmed`: El estado automatico/manual de un grupo se deriva en runtime de los pesos actuales (automatico cuando coinciden con el reparto en partes igu
- REQ-16 (add) `confirmed`: La asignacion en el editor NO usa drag and drop: el mecanismo es SELECCION LATERAL + CLICK. (a) Se elige un elemento en el panel lateral y q
- REQ-17 (add) `confirmed`: El modo "Por malla" del editor es el espejo del modo por competencia: el panel lateral es "COMPETENCIAS DE LA MATRIZ" y lo que se pone en ma
- REQ-08 (edit) `confirmed`: El editor de tributacion ofrece la vista "Por malla" reutilizando los componentes ya existentes de modsComponents/CompetencyAlignmentGrid/ (
- REQ-13 (edit) `confirmed`: El editor muestra un panel lateral de SELECCION que define el elemento "en mano": en el modo por competencia se reutiliza PlanSubjectsPanel 
- REQ-07 (edit) `confirmed`: La via masiva, accesible desde la accion "Varias" de la card o celda de destino, aplica un destino (nivel de desarrollo + tipo) a varias asi

**Tasks agregadas:**

- S4: Extender CompetencyAlignmentDetailModal con el estado SOLO LECTURA de la maqueta: encabezado "<codigo> · <asignatura>", linea "tributa a <competencia>", nivel y tipo como texto con su glosa, "Matriz de competencia", y pie con "Editar en tributacion" + "Listo". Sin rediseniar el modal existente ni crear un componente nuevo. (valida: REQ-09; rollback: Revertir el commit del archivo CompetencyAlignmentDetailModal (modo readonly); el modal vuelve a su render unico previo y la vista solo lectura sigue abriendo el detalle como antes.)
- S4: Extender CompetencyAlignmentDetailModal con el estado EDICION de la maqueta: segmentados de nivel (limitado a los niveles que declara la competencia) y de tipo, bloque "Peso dentro de <nivel>" con input %, badge "REPARTO AUTOMATICO", indicador "<N> evalua · suma <S>%" y accion "Repartir en partes iguales"; pie con "Retirar tributacion" + "Listo". Las filas Desarrolla no exponen campo de peso (R-6). (valida: REQ-09, REQ-05, REQ-06; rollback: Revertir el commit del bloque de peso y de los segmentados en CompetencyAlignmentDetailModal; el modal queda sin edicion de peso y el resto del editor sigue funcionando.)
- S4: Implementar en CompetencyAlignmentGridTable el mecanismo de asignacion por SELECCION + CLICK: elemento en mano con chip "EN MANO · <elemento>" y "x" para soltar, "+ Asignar aca" habilitado en los destinos validos solo con algo en mano, "+" atenuado y aviso "selecciona una asignatura/competencia" cuando no hay nada en mano. Sin draggable ni handlers de arrastre. (valida: REQ-16, REQ-13; rollback: Revertir el commit del mecanismo de seleccion + click en CompetencyAlignmentGridTable; la grilla vuelve al estado previo de asignacion.)
- S4: Implementar el panel lateral "COMPETENCIAS DE LA MATRIZ" del modo por malla: lista de competencias de la matriz, competencia en mano con chip y "x", y selector "Nivel de desarrollo con que se va a asignar" que condiciona la asignacion. (valida: REQ-17, REQ-13; rollback: Revertir el commit del panel de competencias; el modo por malla queda sin panel de seleccion propio y el modo por competencia sigue con PlanSubjectsPanel.)
- S4: Dibujar las cards de asignatura por periodo del modo por malla (period/position de planEntry) con "+ Asignar aca" cuando hay competencia en mano, chip de tributacion y confirmacion tras asignar, y accion "Varias" que abre la via masiva. Reusando CompetencyAlignmentGridTable, sin importar CurriculumMesh de curriculum-design (M-26). (valida: REQ-08, REQ-17, REQ-07; rollback: Revertir el commit de las cards por periodo; la vista por malla deja de ofrecer asignacion y el modo por competencia queda intacto.)
- S4: Barrido de fidelidad: eliminar del codigo, copys y documentacion del editor toda mencion a drag, arrastrar, draggable o "equivalente por teclado", y a un panel lateral de detalle de tributacion; dejar la redaccion en terminos de seleccion + click y de CompetencyAlignmentDetailModal. (valida: REQ-16, REQ-09; rollback: Revertir el commit del barrido de copys y documentacion; no afecta comportamiento en runtime.)
- S4: Test de componente del CompetencyAlignmentDetailModal en sus dos estados: readonly (nivel y tipo como texto con glosa, pie "Editar en tributacion" + "Listo") y edicion (segmentados limitados a los niveles declarados, bloque de peso presente solo en Evaluates/Both, pie "Retirar tributacion" + "Listo"). (valida: REQ-09, REQ-05, REQ-06, test; rollback: Borrar el archivo de test agregado; no afecta codigo de produccion.)
- S4: Test de interaccion del editor: con elemento en mano el click en "+ Asignar aca" crea o mueve la tributacion; el click sobre el elemento ya elegido lo suelta; sin nada en mano el "+" queda atenuado y aparece el aviso. Incluye la asercion de regresion de que no existen atributos ni handlers de arrastre en la grilla. (valida: REQ-16, REQ-13, test; rollback: Borrar el archivo de test agregado; no afecta codigo de produccion.)
- S4: Test del modo por malla: panel "COMPETENCIAS DE LA MATRIZ" pone la competencia en mano, el selector de nivel condiciona la asignacion, la card muestra "+ Asignar aca" y tras asignar queda con su chip y confirmacion, y "Varias" abre la via masiva en lugar de asignar de a una. (valida: REQ-17, REQ-08, REQ-07, test; rollback: Borrar el archivo de test agregado; no afecta codigo de produccion.)

### Enmienda 3
**REQs:**

- REQ-16 (edit) `confirmed`: REQUISITO UNICO de la regla de interaccion sin drag: la asignacion en el editor de tributacion se hace por SELECCION LATERAL + CLICK y nunca
- REQ-17 (edit) `confirmed`: El modo "Por malla" del editor es el espejo del modo por competencia en cuanto a QUE se pone en mano: el panel lateral es "COMPETENCIAS DE L
- REQ-13 (edit) `confirmed`: El editor muestra un panel lateral de SELECCION que define el elemento "en mano": en el modo por competencia se reutiliza PlanSubjectsPanel 
- REQ-08 (edit) `confirmed`: El editor de tributacion ofrece la vista "Por malla" reutilizando los componentes ya existentes de modsComponents/CompetencyAlignmentGrid/ (

**Tasks agregadas:**

- S5: Normalizar la referencia unica de la regla de interaccion sin drag en toda la documentacion del ticket: dejar REQ-16 como el unico numero de la regla (seleccion lateral + click, sin draggable ni handlers de arrastre) y reemplazar cada mencion que hoy la atribuye a REQ-17 u otro numero en la prosa del spec, los tags de vista, la tabla de deltas/conflictos y los enunciados de los casos de prueba. REQ-08, REQ-13 y REQ-17 quedan referenciando a REQ-16 sin re-enunciar la regla. (valida: REQ-16, REQ-17, REQ-13, REQ-08; rollback: Cambio solo de texto en spec/preview y enunciados de TCs, sin tocar codigo de runtime: revertir el commit de normalizacion restaura la numeracion previa (REQ-16/REQ-17 duplicados) sin efecto sobre la app ni la DB.)
- S5: Verificacion de consistencia de la numeracion: correr un grep sobre el spec, los tags de vista, la tabla de deltas/conflictos y los casos de prueba buscando las menciones de la regla sin drag (arrastre, drag, draggable, "selección lateral", "+ Asignar aca") y comprobar que todas apuntan a REQ-16; y un grep sobre modsComponents/CompetencyAlignmentGrid/ comprobando que no hay draggable ni handlers dragstart/dragover/drop/dragend. (valida: REQ-16, test; rollback: Task de solo verificacion (greps, sin escritura): no requiere rollback; si falla, se corrige la task de normalizacion previa.)

### Enmienda 4
**REQs:**

- REQ-09 (edit) `confirmed`: El detalle de una tributacion vive en el CompetencyAlignmentDetailModal YA EXISTENTE en modsComponents/CompetencyAlignmentGrid/ (Modal de @m

**REQ ops:**

- remove REQ-15

### Enmienda 5
**REQs:**

- REQ-10 (edit) `confirmed`: La vista solo lectura de tributacion es la pestana "Tributacion" del plan: no muestra el selector de asignatura en ninguno de sus dos modos 
- REQ-11 (edit) `confirmed`: Las dos vistas del editor (por competencia y por malla) se dibujan con la misma CompetencyAlignmentGridTable y operan sobre la misma via gob

**Task ops:**

- delete S4.T1.2
- delete S4.T1.3
- delete S4.T1.4
- delete S5.T2
- delete S5.T3

### Enmienda 6

**Task ops:**

- delete S4.T5
- delete S4.T2.2
- delete S4.T2.3

### Enmienda 7
**REQs:**

- REQ-09 (edit) `confirmed`: El detalle de una tributacion vive en el CompetencyAlignmentDetailModal YA EXISTENTE en modsComponents/CompetencyAlignmentGrid/ (Modal de @m
- REQ-18 (add) `confirmed`: El editor de tributacion mantiene un BORRADOR en memoria del conjunto (planId, matriz) en el shell CompetencyAlignmentGridElement: al cargar
- REQ-19 (add) `confirmed`: El editor expone un guardado ACCIONABLE del conjunto: la accion "Guardar" valida el borrador y commitea el conjunto completo de (planId, mat
- REQ-20 (add) `confirmed`: Con cambios sin guardar en el borrador, el editor avisa antes de perderlos: al salir del editor (volver a la pestana "Tributacion" o navegar

**Tasks agregadas:**

- S7: Modelar el BORRADOR en memoria del conjunto (planId, matriz) en el shell CompetencyAlignmentGridElement: snapshot del conjunto persistido al cargar la matriz, estructura de trabajo indexada por fila, dirty tracking derivado (comparacion contra el snapshot) y API interna (upsertRow/removeRow/setField/reset) que consumen ambos modos. Sin cambios de backend. (valida: REQ-18; rollback: Revertir el commit del shell; el editor vuelve al guardado inmediato per-field ya entregado en S3/S4.)
- S7: Rewire de las acciones del modo POR COMPETENCIA (PlanSubjectsPanel + CompetencyAlignmentGridTable + CompetencyAlignmentDetailModal): asignar/mover/retirar (REQ-16), nivel de desarrollo, tipo de contribucion, peso, repartir en partes iguales y tope dinamico (Adenda 2) pasan a mutar el borrador; se elimina la persistencia per-field de performAssign y equivalentes. (valida: REQ-18; rollback: Revertir el commit; performAssign y los handlers per-field vuelven a persistir al instante.)
- S7: Rewire de las acciones del modo POR MALLA (MatrixCompetenciesPanel + MatrixMeshView + el mismo CompetencyAlignmentDetailModal): "+ Asignar aca", retiro, nivel, tipo y peso pasan a mutar el mismo borrador del shell, garantizando que ambos modos comparten modelo y producen el mismo payload. (valida: REQ-18, REQ-19; rollback: Revertir el commit; MatrixMeshView vuelve a la vía per-field entregada en S4.)
- S7: Implementar la barra de guardado accionable del editor: acciones "Guardar" (valida el borrador, serializa el conjunto completo de (planId, matriz) y commitea en una unica llamada a upsertCompetencyAlignmentSetValidated, manejo de error todo-o-nada conservando el borrador) y "Descartar" (revierte al ultimo snapshot guardado); ambas deshabilitadas sin cambios pendientes. Tras guardar con exito, refrescar el snapshot desde la respuesta/refetch de alignmentView. (valida: REQ-19, REQ-01, REQ-11; rollback: Revertir el commit; la barra desaparece y no se invoca la mutacion de conjunto desde el editor.)
- S7: Aviso de cambios sin guardar: interceptar la salida del editor (volver a la pestana "Tributacion" / navegacion) y el cambio de matriz cuando el borrador esta dirty, con confirmacion continuar/cancelar; cancelar deja borrador y seleccion intactos. (valida: REQ-20; rollback: Revertir el commit; la salida y el cambio de matriz vuelven a ser directos.)
- S7: Tests de componente del borrador y del guardado accionable: mutaciones del borrador sin red en ambos modos, Guardar emite una sola llamada a upsertCompetencyAlignmentSetValidated con el conjunto completo, fallo del backend = todo-o-nada con borrador conservado, Descartar revierte, Guardar/Descartar deshabilitados sin cambios, y aviso de cambios sin guardar al salir y al cambiar de matriz (incluido el caso sin cambios, sin aviso). (valida: REQ-18, REQ-19, REQ-20, test; rollback: Revertir el commit de tests.)
- S7: Test de integracion de paridad de payload entre modos: aplicar la misma secuencia de cambios en el modo por competencia y en el modo por malla y verificar que el payload de batch de (planId, matriz) es identico y que el guardado usa la misma via gobernada; mas regresion de lo entregado en S3/S4 (CRUD de tributacion de 1756 verde, modal de detalle, reparto y tope de peso). (valida: REQ-19, REQ-11, REQ-01, test; rollback: Revertir el commit de tests.)

### Enmienda 8

**Task ops:**

- edit S3.T5 { desc="Extender CompetencyAlignmentDetailModal (modsComponents/CompetencyAlignmentGrid/) en su estado SOLO LECTURA segun la decision A: muestra asignatura, competencia a la que tributa, nivel de desarrollo, tipo de contribucion con su glosa y matriz de competencia, y su pie tiene UNICAMENTE la accion \"Listo\". NO se agrega un boton \"Editar en tributacion\": en up1 se pasa a edicion por el modo global del registro (modo edicion de la pantalla), no desde el modal. El estado EDICION conserva el control segmentado de nivel de desarrollo (limitado a los niveles que la competencia declara), el control segmentado de tipo de contribucion, el bloque de peso (REQ-05) y las acciones \"Retirar tributacion\" y \"Listo\". Sin panel lateral de detalle ni componente de detalle paralelo (REQ-09).", rollback="Revertir los cambios del archivo CompetencyAlignmentDetailModal.ts/vue al commit previo (git checkout del archivo); no hay migracion ni dato persistido involucrado." }
- edit S3.T8 { desc="Test de componente de CompetencyAlignmentDetailModal: en estado SOLO LECTURA verificar que el pie expone SOLO el boton \"Listo\" y que NO existe un boton \"Editar en tributacion\" (assert de ausencia), ademas de que se rendericen asignatura, competencia, nivel de desarrollo, tipo de contribucion con glosa y matriz; en estado EDICION verificar los controles segmentados de nivel y tipo, el bloque de peso y las acciones \"Retirar tributacion\" y \"Listo\". El test debe fallar si reaparece el boton \"Editar en tributacion\" en solo lectura (decision A, criterio de gate de S3).", rollback="Revertir el archivo de test al commit previo (git checkout del spec); no toca codigo de produccion." }

### Enmienda 9
**REQs:**

- REQ-21 (add) `confirmed`: La via masiva del modo malla es "Agregar competencias": se abre desde la accion "Varias" de la card de una asignatura y su DESTINO es FIJO =
- REQ-22 (add) `confirmed`: La accion "Asociar" de "Agregar competencias" NO commitea: agrega N filas al BORRADOR en memoria del conjunto (planId, matriz) en competency

**Tasks agregadas:**

- S8: Redisenar CompetencyAlignmentBulkApplyModal a "Agregar competencias": destino FIJO = la asignatura de la card que abre el modal (subtitulo "Se asociaran a <codigo> · <asignatura>"); la lista son las competencias HOJA de la(s) matriz(es) adoptada(s), agrupadas por matriz con contador por grupo; las que la asignatura ya tributa se muestran tildadas, en gris, con etiqueta "Ya tributa" y no seleccionables; solo se marcan las nuevas y el contador "N seleccionado(s)" cuenta solo esas; selectores de Nivel de desarrollo + Tipo de contribucion arriba (mismo enum fijo de contributionTypes.ts) aplicados a todo lo nuevo seleccionado; buscador por texto (codigo / competencia / matriz); botones "Todos"/"Ninguno"; boton de accion "Asociar". Quitar la dependencia de la competencia "en mano" y la lista de asignaturas de la semantica anterior. (valida: REQ-21; rollback: git checkout -- la ruta del modal CompetencyAlignmentBulkApplyModal.vue en modsComponents/CompetencyAlignmentGrid/ para restituir la version de S5 (lista de asignaturas + competencia en mano); no hay cambios de esquema ni de datos que revertir.)
- S8: Integrar "Asociar" al BORRADOR en memoria: en competencyAlignmentDraft.logic.ts agregar N filas al borrador (una por competencia nueva, con el nivel+tipo elegidos) marcando dirty, sin persistir; derivar el estado "Ya tributa" del borrador y no del snapshot persistido. En el shell CompetencyAlignmentGridElement.vue eliminar el flujo inmediato de la via masiva: el guard de "descartar cambios sin guardar" al abrir (showBulkUnsavedConfirm / onConfirmBulkUnsaved), la mutation inmediata y el re-baseline por loadView en onBulkApply; la persistencia queda a cargo de "Guardar Tributacion" (upsertCompetencyAlignmentSetValidated). La mutation bulkApplyCompetencyAlignmentValidated queda sin uso desde el editor (no se elimina del backend). (valida: REQ-22; rollback: git checkout -- competencyAlignmentDraft.logic.ts y CompetencyAlignmentGridElement.vue para restituir el flujo inmediato de S5 (guard de descarte + mutation + loadView); la mutation de backend nunca se toco, asi que no requiere revertirse.)
- S8: i18n en competencyAlignmentGrid.i18n.json para es/en/pt: agregar las claves de "Agregar competencias" (titulo, "Se asociaran a <codigo> · <asignatura>", "Ya tributa", "Asociar", placeholder del buscador, "Todos", "Ninguno", contador "N seleccionado(s)") y quitar las claves de la semantica vieja de la via masiva que queden sin uso (p.ej. subjectsLabel y el bloque de resultado con salteadas), verificando con grep que ninguna otra vista las consuma antes de borrarlas. (valida: REQ-21, REQ-22; rollback: git checkout -- competencyAlignmentGrid.i18n.json para restituir el set de claves de S5 en los tres idiomas.)
- S8: Tests de componente del modal y del borrador: el modal lista competencias hoja agrupadas por matriz (no asignaturas) y muestra el subtitulo con la asignatura destino; las competencias ya tributadas aparecen con "Ya tributa" y no son seleccionables ni suman al contador; el buscador y "Todos"/"Ninguno" operan solo sobre las nuevas; "Asociar" agrega N filas al borrador y marca dirty sin llamar a la red; "Guardar Tributacion" persiste esas filas en una unica llamada a upsertCompetencyAlignmentSetValidated; abrir el modal con cambios pendientes no dispara el guard de descarte ni re-baseline. Actualizar o retirar los tests de S5 que afirmen la semantica vieja (competencia en mano -> N asignaturas, transaccion inmediata, panel de salteadas). (valida: REQ-21, REQ-22, test; rollback: git checkout -- los archivos de test tocados para restituir la suite de S5; sin efectos fuera de los specs.)

### Enmienda 10
**REQs:**

- REQ-23 (add) `confirmed`: En el bloque "Peso dentro de <nivel>" del CompetencyAlignmentDetailModal, cada fila de peso muestra una etiqueta de DOS lineas: arriba el co
- REQ-24 (add) `confirmed`: El modo "Por competencia" del editor expone la via masiva "Agregar asignaturas": cada fila de competencia de la grilla (columna COMPETENCIA,

**Tasks agregadas:**

- S9: Etiqueta de dos lineas en la fila de peso del CompetencyAlignmentDetailModal: renderizar el codigo de la asignatura en tamanio menor sobre el nombre, con fallback a solo codigo cuando falta el nombre, alineacion vertical centrada respecto del input de % y aria-label "codigo · nombre"; agregar el CSS correspondiente al bloque de peso existente. (valida: REQ-23; rollback: git checkout -- los archivos del CompetencyAlignmentDetailModal y su CSS; la fila vuelve a mostrar solo el codigo de la asignatura y el aria-label previo.)
- S9: Generalizar CompetencyAlignmentBulkApplyModal a una asociacion masiva direccional con items genericos (id, codigo, nombre, grupo, ya-tributa): props de titulo/subtitulo, lista agrupada con contador y checkbox de grupo que opera solo sobre los seleccionables del grupo, buscador por codigo/nombre, "Todos"/"Ninguno" solo sobre las nuevas visibles, contador de nuevas y accion "Asociar" que emite los items elegidos; mantener el comportamiento actual de la via de malla "Agregar competencias" sobre el mismo componente, sin modal paralelo. (valida: REQ-24, REQ-21, REQ-22; rollback: git checkout -- CompetencyAlignmentBulkApplyModal y sus consumidores; el modal vuelve a su forma especifica de "Agregar competencias" del modo malla.)
- S9: Boton "Varias" en la fila de competencia de CompetencyAlignmentGridTable (solo si la competencia es destino valido, es decir no consolida, y solo en modo edicion) + cableado en el shell CompetencyAlignmentGridElement: armar los items de asignaturas del plan agrupadas por periodo, derivar "ya tributa" desde el BORRADOR, acotar el selector de nivel a los niveles que declara la competencia (default el primero) y aplicar "Asociar" agregando N filas al borrador con nivel+tipo elegidos, marcando dirty sin llamada de red ni re-baseline. (valida: REQ-24; rollback: git checkout -- CompetencyAlignmentGridTable, el shell CompetencyAlignmentGridElement y la logica del borrador; el modo por competencia queda sin el boton "Varias" y sin la via masiva de asignaturas.)
- S9: i18n es/en/pt de los textos nuevos de la via masiva "Agregar asignaturas": titulo, subtitulo "Se asociaran a <codigo> · <competencia>.", placeholder del buscador por codigo o nombre, encabezado "Periodo N" con contador, etiqueta "Ya tributa", glosas de nivel ("Con que profundidad la aborda.") y tipo ("Solo Evalua y Ambas generan evidencia de logro."), nota de aplicacion a todo lo seleccionado, contador "N seleccionado(s)" y acciones "Cancelar"/"Asociar". (valida: REQ-24; rollback: git checkout -- los archivos de i18n del mod; se pierden las keys nuevas y el modal vuelve a los textos previos.)
- S9: Tests de componente/logica: REQ-23 (etiqueta de dos lineas con codigo y nombre, fallback sin nombre, aria-label "codigo · nombre") y REQ-24 (apertura del modal con destino fijo y subtitulo, agrupacion por periodo, "Ya tributa" derivado del borrador y excluido del contador, checkbox de grupo acotado a los seleccionables del periodo, "Asociar" agrega N filas al borrador sin red y habilita Guardar/Descartar, niveles acotados a los que declara la competencia, ausencia de "Varias" en solo lectura y en competencias que consolidan) + regresion de la via de malla "Agregar competencias" (REQ-21/REQ-22). (valida: REQ-23, REQ-24, REQ-21, REQ-22, test; rollback: git checkout -- los archivos de test agregados; se pierde la cobertura de REQ-23/REQ-24 y la regresion explicita de la via de malla.)
## Sessions

### Session 1 · T1 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3

**Gate (auto)**: Peso validado de punta a punta en el backend gobernado: el validador de CompetencyAlignment acepta contributionPercentage como string en [0,100] con 2 decimales sin truncar y rechaza cualquier valor en filas Develops (R-6), con la clave de grupo (planId, competencyNodeId, developmentLevelId) explicita. Se revisa corriendo la suite unitaria del validador (rango, precision, no truncado, los tres tipos, mensaje por fila con indice) y npm run sync sin drift.

### Session 2 · T1 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T1.1
- [x] S2.T1.2
- [x] S2.T1.3
- [x] S2.T1.4
- [x] S2.T1.5
- [x] S2.T2
- [x] S2.T3

**Gate (auto)**: El guardado de una matriz es un upsert de conjunto transaccional: se ejecuta la mutacion de batch para un (planId, matriz) y se observa que reemplaza el conjunto, retira solo lo del scope planId + competencias de la matriz, no toca otra matriz adoptada ni las filas fuera de diseno, revierte entero ante una fila invalida, deriva planId server-side, deja una sola entrada de historial y rechaza un RBAC sin create+modify+delete. Se revisa con la suite de integracion del batch (incluida la regresion del CRUD de 1756) y sync/codegen sin drift ni artefactos commiteados.

### Session 3 · T2 · continue

**Tasks:**
- [x] S3.T1
- [x] S3.T1.1
- [x] S3.T1.2
- [x] S3.T1.3
- [x] S3.T1.4
- [x] S3.T1.5
- [x] S3.T2
- [x] S3.T3
- [x] S3.T4
- [x] S3.T5
- [x] S3.T6
- [x] S3.T7
- [x] S3.T7.1
- [x] S3.T7.2
- [x] S3.T8
- [x] S3.T9

**Gate (auto)**: Editor de tributación por competencia usable end-to-end, ceñido a cómo funciona up1. En up1 el ver/editar es el MODO del registro (enableEdit por layout: default_Curriculum_view.json=false, default_Curriculum_edit.json=true), NO un botón "Tributar". En MODO VER: la pestaña "Tributación" no muestra el panel de selección de asignatura (PlanSubjectsPanel) ni afordances de asignar; el modal de detalle abre en solo-lectura con nivel/tipo como texto con glosa y pie SOLO "Listo" (decisión A del dev 2026-09-21: NO botón "Editar en tributación", porque en up1 se edita por el modo global del registro). En MODO EDICIÓN: panel PlanSubjectsPanel + CompetencyAlignmentGridTable + CompetencyAlignmentDetailModal; interacción selección+click sin drag (chip "EN MANO", "+ Asignar acá", atenuado + aviso sin nada en mano); el modal muestra segmentados de nivel/tipo y el bloque "Peso dentro de <nivel>" con input %, badge "Reparto automático" (derivado), indicador "<N> evalúa · suma <S>%" y "Repartir en partes iguales"; filas Desarrolla sin peso (R-6); cambiar el tipo a Desarrolla limpia el peso a null (REQ-04); tope DINÁMICO por presupuesto del grupo (máximo = 100 − suma de las otras que pesan), heredando el flujo del tope de 100 (inválido + revert en blur), con mensaje "Solo tienes disponible {n}% para asignar"; el mensaje de error del peso se muestra a ancho completo bajo la fila (input solo con borde rojo). GUARDADO: per-field inmediato (updateCompetencyAlignmentValidated), con el tope dinámico como guardarraíl; NO se cabla la mutation de batch de S2 (upsertCompetencyAlignmentSetValidated queda para una sesión futura, opción B "Guardar/Descartar"). La garantía dura de "cada grupo suma 100" NO es de este editor: es el guard AL PUBLICAR el plan (pendiente cross-mod D1, fuera de alcance de este ticket). Verificación: suite del mod curriculum-mapping en verde por su propio runner (2501 tests, incluye weights.ts, R-6, sin-drag, tope dinámico, limpiar peso en Develops) + revisión visual humana del dev. NOTA: el sandbox del gate no ejecuta el proyecto up1 (reporta ~18 tests / 0% cobertura); esa cobertura es artefacto del sandbox, no un hueco real.

### Session 4 · T2 · continue

**Tasks:**
- [x] S4.T1
- [x] S4.T2
- [x] S4.T3
- [x] S4.T4
- [x] S4.T4.1
- [x] S4.T4.2
- [x] S4.T5
- [x] S4.T6
- [x] S4.T6.1
- [x] S4.T6.2
- [x] S4.T6.3
- [x] S4.T6.4
- [x] S4.T6.5
- [x] S4.T6.6

**Gate (auto)**: Modo "Por malla" del editor operativo, ceñido a cómo funciona up1 y a las decisiones del dev (ver Adenda 3). ARQUITECTURA: el shell ORQUESTA por modo el par sidebar+superficie: por competencia (PlanSubjectsPanel + CompetencyAlignmentGridTable) y por malla (MatrixCompetenciesPanel + MatrixMeshView). MatrixMeshView es una superficie hermana (NO se fusiona en la grilla ni se borra); ambas superficies COMPARTEN el mismo CompetencyAlignmentDetailModal y la misma vía de guardado gobernada (performAssign, PER-FIELD; NO batch — el batch de S2 queda para una sesión futura; el "=100" es el guard al publicar D1). PANEL "COMPETENCIAS DE LA MATRIZ": espejo del panel de asignaturas (buscador; filtros Todas/Con asignaturas/Sin asignaturas con contador de ASIGNATURAS distintas; lista scrolleable de altura fija); lista SOLO competencias hoja (las que consolidan quedan fuera); competencia en mano con chip "EN MANO" + "x"; nivel de desarrollo como SELECTOR (dropdown) con default al primer nivel y reset al cambiar de competencia. VISTA: cards de asignatura agrupadas por período en COLUMNAS (bloque sin período incluido), título de período como card con fondo de color; cada card muestra las COMPETENCIAS que tributa (relación invertida) como chips (nivel I/R/M + tipo D/E/A) que abren el modal; "+ Asignar acá" (mismo elemento que por competencia) activo con competencia hoja + nivel en mano, atenuado con aviso ESPECÍFICO (falta selección / consolida / nivel no declarado); "Varias" = gancho a la vía masiva (S5), oculto en solo lectura; interacción selección+click sin drag (REQ-16); empty de card "Sin tributar" (naranja), empty de competencia "Sin asignaturas". En solo lectura no hay afordances de asignar. Verificación: suite del mod curriculum-mapping en verde por su propio runner (2585 tests: matrix-competencies-panel, matrix-mesh-view, mesh-assign end-to-end, component/toggle, weights, sin-drag, sin import de CurriculumMesh M-26) + vue-tsc 0 errores + revisión visual humana del dev. NOTA: el sandbox del gate no ejecuta up1 (reporta ~18 tests/0% cobertura); es artefacto del sandbox, no un hueco real. Commit ed1ad9f.

### Session 5 · T2 · continue

**Tasks:**
- [x] S5.T1
- [x] S5.T2
- [x] S5.T3

**Gate (auto)**: Via masiva viva: desde 'Varias' en una card o celda de destino se eligen varias asignaturas y un destino (nivel + tipo), se aplica en una sola transaccion con troceo en el backend y el panel de resultado lista las aplicadas y las salteadas con codigo, nombre y motivo. Se revisa en pantalla y con los tests de lote valido, lote con duplicados, item fuera del plan, fallo con reversion total y lote de 200 sin timeout.

### Session 6 · T1 · continue

**Tasks:**
- [x] S6.T1
- [x] S6.T2

**Gate (auto)**: Cierre verificable: el test de paridad MCP cubre contributionPercentage y deja asentado el hueco de la via generica; el editor no contiene mencion alguna a drag/arrastrar/draggable/'equivalente por teclado' ni a un panel lateral de detalle en codigo, copys ni documentacion. Se revisa con la suite completa de curriculum-mapping en verde (CRUD de 1756 incluido), la suite de paridad MCP, el grep de fidelidad sin resultados y npm run sync/codegen sin drift con los artefactos fuera del commit.

### Session 7 · T2 · continue

**Tasks:**
- [x] S7.T1
- [x] S7.T2
- [x] S7.T3
- [x] S7.T4
- [x] S7.T5
- [x] S7.T6
- [x] S7.T7
- [x] S7.T8

**Gate (auto)**: Guardado en conjunto (Guardar/Descartar) operativo en el editor de tributación, cumpliendo REQ-01/REQ-11/REQ-18/REQ-19/REQ-20, más los tests de fidelidad de componentes reales (S7.T1). El editor trabaja sobre un BORRADOR en memoria (competencyAlignmentDraft.logic.ts): al cargar la matriz toma snapshot; TODAS las acciones de AMBOS modos (asignar/mover/retirar, nivel, tipo, peso, repartir, tope dinámico) mutan el borrador SIN persistir per-field (se quitaron las mutaciones por campo). Barra de guardado: "Guardar Tributación" valida y commitea el conjunto completo de (planId, matriz) en UNA llamada a upsertCompetencyAlignmentSetValidated (transaccional, todo-o-nada; ante error conserva el borrador y muestra el error; tras éxito refresca el snapshot, isDirty=false); "Descartar cambios" revierte al último snapshot; ambos deshabilitados sin cambios pendientes. Ambos modos (competencia y malla) comparten el mismo borrador y producen el MISMO payload de batch (verificado a nivel de argumento de la mutación). Aviso de cambios sin guardar al CAMBIAR DE MATRIZ (ConfirmationModal; cancelar preserva; continuar descarta); LIMITACIÓN documentada: salir del editor por pestaña/router no es interceptable desde el element sin infra nueva (no hay onBeforeRouteLeave en el codebase) y el toggle competencia/malla no avisa porque no pierde datos. Verificación: suite del mod curriculum-mapping en verde por su runner (2612 tests: draft.logic, save-bar, matrix-switch, mesh-assign paridad, grid/weight/detail sin red, + regresión CRUD 1756) + vue-tsc 0. NOTA: el sandbox del gate no ejecuta up1 (cobertura 0% = artefacto). Labels del dev: "Guardar Tributación"/"Descartar cambios".

### Session 8 · continue

**Tasks:**
- [x] S8.T1
- [x] S8.T2
- [x] S8.T3
- [x] S8.T4

**Gate (strong)**: La vía masiva del modo malla queda como "Agregar competencias": destino fijo = la asignatura de la card, la lista son competencias hoja agrupadas por matriz, las ya tributadas aparecen tildadas/grises/no seleccionables con "Ya tributa", buscador de texto + Todos/Ninguno, Nivel+Tipo aplicados a lo nuevo, botón "Asociar". "Asociar" agrega filas al BORRADOR en memoria (no persiste; no hay transacción inmediata, ni guard de descartar cambios al abrir, ni re-baseline por loadView) y se guardan por el upsert de conjunto de "Guardar Tributación". Sin dependencia de competencia en mano. Suite del mod verde, vue-tsc 0, sync/codegen sin drift.

### Session 9 · continue

**Tasks:**
- [x] S9.T1
- [x] S9.T2
- [x] S9.T3
- [x] S9.T4
- [x] S9.T5

**Gate (strong)**: Adenda 6: (1) la fila de peso del modal de detalle muestra código (chico) + nombre de la asignatura en dos líneas, centrado con su input %; (2) el modo Por competencia tiene "Varias" en cada fila de competencia destino válido (oculto en solo lectura y en las que consolidan) que abre "Agregar asignaturas": destino fijo = la competencia, asignaturas agrupadas por período con checkbox de grupo, "Ya tributa" derivado del borrador y bloqueado, buscador, Todos/Ninguno, nivel acotado a los declarados + tipo, "Asociar" agrega al borrador sin red. El modal masivo queda generalizado (un solo componente para ambas direcciones) y la vía de malla no cambia. Suite del mod verde, vue-tsc 0, sync sin drift.
