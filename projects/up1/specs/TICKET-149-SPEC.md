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
> Fuente: Request - Adenda 1 (c) (el detalle vive en el CompetencyAlignmentDetailModal YA EXISTENTE, extendido con el bloque de peso) + Criterios de aceptacion; maqueta 'UPONE-1770 - referencias visuales de la maqueta'

El detalle de una tributacion vive en el CompetencyAlignmentDetailModal YA EXISTENTE en modsComponents/CompetencyAlignmentGrid/ (Modal de @molecules, v-model:open), que 1770 EXTIENDE sin rediseniar ni duplicar, y tiene dos estados resultantes: (a) SOLO LECTURA: muestra la asignatura y la competencia a la que tributa, el nivel de desarrollo, el tipo de contribucion con su glosa y la matriz de competencia, con las acciones "Editar en tributacion" y "Listo"; (b) EDICION: muestra el nivel de desarrollo como control segmentado limitado a los niveles que la competencia declara, el tipo de contribucion como control segmentado, el bloque de peso (REQ-05) y las acciones "Retirar tributacion" y "Listo". No existe un panel lateral de detalle ni un componente de detalle paralelo.

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
## Tasks

#### S1.T1 — Agregar contributionPercentage a WRITABLE_FIELDS y a la validación por fila en curriculum-mapping/logic/helpers/validateCompetencyAlignment.js: porcentaje en [0,100], máximo 2 decimales, transportado como string y sin truncar. Reusar el criterio de precisión ya vigente del módulo (isValidWeight/hasWeightPrecision de validateCompetencyTree.js, RULE-1758) en lugar de escribir uno nuevo. Validación: unit test del helper + npm run sync sin drift.
Contrato: rollback: git checkout de logic/helpers/validateCompetencyAlignment.js y re-ejecutar npm run sync para restaurar el artefacto copiado a core.. Status: pending

#### S1.T2 — Implementar R-6 en el mismo validador: tipo Develops obliga contributionPercentage null (rechaza cualquier valor), Evaluates/Both lo admiten; dejar explícito el grupo (planId, competencyNodeId, developmentLevelId) como clave de agrupación del peso, alineado al índice compuesto de 1769. Validación: unit tests de los tres tipos.
Contrato: rollback: git checkout del helper; el índice de 1769 no se toca, así que no hay migración que revertir.. Status: pending

#### S1.T3 — Tests unitarios del validador de peso: rango, precisión, no truncado, R-6 por tipo y mensajes de error por fila con índice identificable. Reporte de suites con totales y clasificación introducido vs preexistente.
Contrato: rollback: git checkout de los archivos de test agregados en curriculum-mapping/tests/unit/.. Status: pending

#### S2.T1 — Construir la mutación de upsert de conjunto de CompetencyAlignment acotada a (planId, matriz), siguiendo competencyTree-upsert.resolver.js y el RBAC restituido estilo planEntry-batch (no delega en el generic). Objetivo de la task; se completa solo con sus subtasks.
Contrato: rollback: Eliminar el par resolver + .schema.graphql nuevo y re-ejecutar npm run sync; la UI sigue usando la vía anterior hasta la sesión 4.. Status: pending

#### S2.T1.1 — Crear el par resolver + schema en curriculum-mapping/logic/: const exportada con la palabra Mutation en el nombre (RULE-mods-004), archivo .schema.graphql companion con el mismo basename (RULE-mods-002) usando extend type Mutation (RULE-mods-006). Validación: el server arranca y la mutación aparece en el schema tras sync.
Contrato: rollback: Borrar ambos archivos y correr npm run sync.. Status: pending

#### S2.T1.2 — Implementar el cuerpo transaccional con runInTransaction: derivar planId server-side, correr R-1..R-5/R-10 por fila reusando validateCompetencyAlignment, y abortar todo el conjunto ante la primera violación. Validación: test de integración de rollback total.
Contrato: rollback: git checkout del resolver.. Status: pending

#### S2.T1.3 — Implementar el scope de retiro: seleccionar las filas existentes por planId + competencyNodeId perteneciente a las competencias de la matriz (mismo filtro que alignmentView.resolver.js:293), retirar solo las de ese scope que no vinieron en el payload, y excluir del retiro las filas marcadas fuera de diseño (R-12). Rechazar payloads con competencyNodeId ajeno a la matriz.
Contrato: rollback: git checkout del resolver; ningún dato migrado que revertir (el batch no corrió en producción).. Status: pending

#### S2.T1.4 — RBAC propio que exige create+modify+delete sobre CompetencyAlignment y registro de una sola entrada de historial por operación de conjunto. Validación: test con usuario sin delete que recibe error de autorización.
Contrato: rollback: git checkout del resolver.. Status: pending

#### S2.T1.5 — Dimensionamiento: acotar el batch con tamaño máximo de conjunto por llamada y escrituras agrupadas dentro de la transacción (no una sentencia por fila en bucle abierto). Validación: guardado de un conjunto de 300 filas dentro del presupuesto de tiempo, sin timeout.
Contrato: rollback: git checkout del resolver.. Status: pending

#### S2.T2 — Correr npm run sync y codegen, verificar cero drift y que los artefactos de sync no queden commiteados (RULE-mods-001/003). Reportar los archivos copiados a core que quedan fuera del commit.
Contrato: rollback: git checkout de los workspaces de core alcanzados por el sync y re-ejecutar sync desde el mod fuente.. Status: pending

#### S2.T3 — Tests de integración del batch: creación, reemplazo, retiro dentro del scope, no interferencia con otra matriz adoptada ni con filas fuera de diseño, rollback total ante fila inválida, planId derivado server-side, una sola entrada de historial y RBAC incompleto. Incluye regresión del CRUD de 1756.
Contrato: rollback: git checkout de los tests agregados en curriculum-mapping/tests/integration/.. Status: pending

#### S3.T1 — Quitar el selector de asignatura de la vista solo lectura en sus dos modos (por asignatura y por competencia), dejando el selector de matriz y el botón "Tributar" intactos; limpiar el handler y las keys de i18n que quedan huérfanas, sin tocar el editor. Objetivo de la task; se completa solo con sus subtasks.
Contrato: rollback: git checkout del componente de la vista solo lectura y de los archivos de lang del mod, y correr npm run sync.. Status: pending

#### S3.T1.1 — Análisis de impacto previo: grep del selector de asignatura, de su handler de cambio y de sus keys de i18n en todo el mod, separando los usos de la vista solo lectura de los del editor (que se conservan). Reportar la lista de archivos alcanzados antes de editar; si el selector es un componente compartido entre solo lectura y editor, dejar asentado que se quita por composición (prop/flag en el consumidor de solo lectura), no borrando el componente.
Contrato: rollback: Sin cambios en código: es una task de lectura.. Status: pending

#### S3.T1.2 — Quitar el selector de asignatura del modo Por asignatura de la vista solo lectura, dejando intactos en la cabecera el selector de matriz y el botón "Tributar". Validación: el DOM del modo no contiene el selector y la cabecera conserva los otros dos controles.
Contrato: rollback: git checkout del componente de la vista solo lectura.. Status: pending

#### S3.T1.3 — Quitar el selector de asignatura del modo Por competencia de la vista solo lectura, verificando que el modo sigue renderizando su contenido con la asignatura resuelta por el contexto (sin depender del selector removido). Validación: el DOM del modo no contiene el selector y la vista carga sin errores de consola.
Contrato: rollback: git checkout del componente de la vista solo lectura.. Status: pending

#### S3.T1.4 — Limpiar el código muerto que deja el retiro en la vista solo lectura: handler de cambio de asignatura, estado/ref asociado y cualquier query o computed que solo alimentaba al selector; sin tocar los equivalentes del editor.
Contrato: rollback: git checkout del componente de la vista solo lectura.. Status: pending

#### S3.T1.5 — Quitar de lang/{locale}.json del mod las keys de i18n que quedan sin consumidor tras el retiro (solo las exclusivas de la vista solo lectura, verificadas por grep contra el editor), respetando el formato plano bajo object.* (RULE-mods-011), y correr npm run sync verificando cero drift.
Contrato: rollback: git checkout de los archivos de lang del mod y re-sync.. Status: pending

#### S3.T2 — Separar las dos superficies: dejar la pestana "Tributacion" del plan como solo lectura sin selector de asignatura y con el boton "Tributar", y que el editor sea la pantalla destino compuesta por panel de seleccion + CompetencyAlignmentGridTable + CompetencyAlignmentDetailModal, sin compartir la barra de acciones de solo lectura.
Contrato: rollback: git revert del commit de la task: vuelve la composicion anterior (selector y grilla mezclados en la pestana); solo cambia routing y composicion de UI, sin efectos en el store ni en la DB.. Status: pending

#### S3.T3 — Montar el panel lateral de SELECCION en el editor: reutilizar PlanSubjectsPanel en el modo por competencia y la matriz de competencias en el modo por malla, con estado de "entidad en mano" que la grilla consume al tributar una celda.
Contrato: rollback: git revert del commit de la task: el editor queda sin panel de seleccion (estado previo a la enmienda); no hay cambios de esquema ni de datos que revertir.. Status: pending

#### S3.T4 — Implementar en CompetencyAlignmentGridTable el mecanismo de asignacion por SELECCION + CLICK: elemento en mano con chip "EN MANO · <elemento>" y "x" para soltar, "+ Asignar aca" habilitado en los destinos validos solo con algo en mano, "+" atenuado y aviso "selecciona una asignatura/competencia" cuando no hay nada en mano. Sin draggable ni handlers de arrastre.
Contrato: rollback: Revertir el commit del mecanismo de seleccion + click en CompetencyAlignmentGridTable; la grilla vuelve al estado previo de asignacion.. Status: pending

#### S3.T5 — Extender CompetencyAlignmentDetailModal con el estado SOLO LECTURA de la maqueta: encabezado "<codigo> · <asignatura>", linea "tributa a <competencia>", nivel y tipo como texto con su glosa, "Matriz de competencia", y pie con "Editar en tributacion" + "Listo". Sin rediseniar el modal existente ni crear un componente nuevo.
Contrato: rollback: Revertir el commit del archivo CompetencyAlignmentDetailModal (modo readonly); el modal vuelve a su render unico previo y la vista solo lectura sigue abriendo el detalle como antes.. Status: pending

#### S3.T6 — Extender CompetencyAlignmentDetailModal con el estado EDICION de la maqueta: segmentados de nivel (limitado a los niveles que declara la competencia) y de tipo, bloque "Peso dentro de <nivel>" con input %, badge "REPARTO AUTOMATICO", indicador "<N> evalua · suma <S>%" y accion "Repartir en partes iguales"; pie con "Retirar tributacion" + "Listo". Las filas Desarrolla no exponen campo de peso (R-6).
Contrato: rollback: Revertir el commit del bloque de peso y de los segmentados en CompetencyAlignmentDetailModal; el modal queda sin edicion de peso y el resto del editor sigue funcionando.. Status: pending

#### S3.T7 — Peso por fila, reparto y estado derivado en el editor. Objetivo de la task; se completa solo con sus subtasks.
Contrato: rollback: git checkout de los componentes y del helper agregados en el mod, borrar las keys de lang nuevas y correr npm run sync.. Status: pending

#### S3.T7.1 — Crear el helper puro weights.ts en los shared composables del mod (pure functions/constants, sin refs ni Apollo, RULE-mods-005): reparto de 100 entre las filas que pesan del grupo con 2 decimales y residuo asignado para que la suma sea exacta, más la derivación del estado automático/manual a partir de los pesos.
Contrato: rollback: Borrar weights.ts y correr npm run sync.. Status: pending

#### S3.T7.2 — Agregar las keys de i18n del peso, el reparto y el estado en lang/{locale}.json del mod respetando el formato plano bajo object.* (RULE-mods-011), y correr npm run sync.
Contrato: rollback: git checkout de los archivos de lang del mod y re-sync.. Status: pending

#### S3.T8 — Test de componente del CompetencyAlignmentDetailModal en sus dos estados: readonly (nivel y tipo como texto con glosa, pie "Editar en tributacion" + "Listo") y edicion (segmentados limitados a los niveles declarados, bloque de peso presente solo en Evaluates/Both, pie "Retirar tributacion" + "Listo").
Contrato: rollback: Borrar el archivo de test agregado; no afecta codigo de produccion.. Status: pending

#### S3.T9 — Test de interaccion del editor: con elemento en mano el click en "+ Asignar aca" crea o mueve la tributacion; el click sobre el elemento ya elegido lo suelta; sin nada en mano el "+" queda atenuado y aparece el aviso. Incluye la asercion de regresion de que no existen atributos ni handlers de arrastre en la grilla.
Contrato: rollback: Borrar el archivo de test agregado; no afecta codigo de produccion.. Status: pending

#### S4.T1 — Implementar el panel lateral "COMPETENCIAS DE LA MATRIZ" del modo por malla: lista de competencias de la matriz, competencia en mano con chip y "x", y selector "Nivel de desarrollo con que se va a asignar" que condiciona la asignacion.
Contrato: rollback: Revertir el commit del panel de competencias; el modo por malla queda sin panel de seleccion propio y el modo por competencia sigue con PlanSubjectsPanel.. Status: pending

#### S4.T2 — Dibujar las cards de asignatura por periodo del modo por malla (period/position de planEntry) con "+ Asignar aca" cuando hay competencia en mano, chip de tributacion y confirmacion tras asignar, y accion "Varias" que abre la via masiva. Reusando CompetencyAlignmentGridTable, sin importar CurriculumMesh de curriculum-design (M-26).
Contrato: rollback: Revertir el commit de las cards por periodo; la vista por malla deja de ofrecer asignacion y el modo por competencia queda intacto.. Status: pending

#### S4.T3 — Unificar la grilla de ambos modos del editor sobre la CompetencyAlignmentGridTable existente (extendiendola con el modo por malla: asignaturas por periodo ordenadas por position desde planEntry), borrar cualquier componente paralelo creado en el ticket y verificar que ambos modos emiten el mismo payload de batch para (planId, matriz).
Contrato: rollback: git revert del commit de la task: la grilla vuelve a su version previa y el modo por malla deja de estar disponible; el batch del backend no se toca, por lo que el guardado del modo por competencia sigue operativo.. Status: pending

#### S4.T4 — Vista "Por malla" en el editor y unificación de la vía de guardado. Objetivo de la task; se completa solo con sus subtasks.
Contrato: rollback: Revertir el toggle de modo y el componente de malla; el editor queda solo con el modo Por competencia, que sigue guardando por el batch.. Status: pending

#### S4.T4.1 — Toggle de modo (Por competencia / Por malla) en el editor, con el estado de la sesión Guardar/Descartar compartido entre ambos modos (los cambios no guardados sobreviven al cambio de modo).
Contrato: rollback: Quitar el toggle y dejar el modo por competencia fijo.. Status: pending

#### S4.T4.2 — Cablear el guardado de ambos modos a la mutación de batch de la sesión 2: un único payload con el conjunto completo del (planId, matriz) y una sola llamada por guardado; verificar por grep que no queda ninguna llamada al CRUD generic de CompetencyAlignment en los componentes.
Contrato: rollback: Volver a apuntar el guardado a la vía anterior revirtiendo el composable de API del editor.. Status: pending

#### S4.T5 — Test del modo por malla: panel "COMPETENCIAS DE LA MATRIZ" pone la competencia en mano, el selector de nivel condiciona la asignacion, la card muestra "+ Asignar aca" y tras asignar queda con su chip y confirmacion, y "Varias" abre la via masiva en lugar de asignar de a una.
Contrato: rollback: Borrar el archivo de test agregado; no afecta codigo de produccion.. Status: pending

#### S4.T6 — Tests y regresión de cierre: unit del helper weights.ts (reparto de 3, 4 y 1 fila, estado derivado), tests de componente para la ausencia del selector en solo lectura y su presencia en el editor, agrupación por período incluido el caso sin período, guardado único por batch desde ambos modos, suite completa de curriculum-mapping con el CRUD de 1756 en verde, npm run sync y codegen sin drift y artefactos de sync fuera del commit. Objetivo de la task; se completa solo con sus subtasks.
Contrato: rollback: git checkout de los tests agregados; si el sync dejó drift, restaurar los workspaces de core desde HEAD y re-sync desde el mod fuente.. Status: pending

#### S4.T6.1 — Unit tests del helper weights.ts: reparto en grupos de 1, 3 y 4 filas que pesan con suma exacta 100 y residuo asignado, exclusión de las filas Develops del reparto, grupo sin filas que pesan, y derivación del estado automático/manual (incluye el caso 25/25/25/25 que vuelve a dar automático tras recarga).
Contrato: rollback: git checkout de los tests unitarios agregados.. Status: pending

#### S4.T6.2 — Tests de componente del peso en el editor: inputs independientes por fila Evaluates/Both, ausencia de input en filas Develops, error de rango en la propia fila con guardado deshabilitado ante 100.5, y badge de estado que pasa a manual al editar un valor sin llamada al backend.
Contrato: rollback: git checkout de los tests de componente agregados.. Status: pending

#### S4.T6.3 — Tests de componente de la vista Por malla: agrupación por período con orden por position, bloque de asignaturas sin período, estado vacío "Sin tributar", panel lateral con las competencias de la matriz, y grep que confirma cero imports de curriculum-design y cero referencias a CurriculumMesh (M-26).
Contrato: rollback: git checkout de los tests agregados.. Status: pending

#### S4.T6.4 — Tests de componente del selector: ausencia en los dos modos de la vista solo lectura, presencia y operatividad en los dos modos del editor, y verificación de que no quedan keys de i18n huérfanas ni referencias muertas al handler removido.
Contrato: rollback: git checkout de los tests agregados.. Status: pending

#### S4.T6.5 — Test de la vía única de guardado: editar en Por competencia, cambiar a Por malla y guardar emite una sola llamada a la mutación de batch con el conjunto completo del (planId, matriz); los cambios sin guardar sobreviven al cambio de modo; "Descartar" restituye el último guardado sin emitir mutación; grep sin llamadas al CRUD generic desde los componentes del editor.
Contrato: rollback: git checkout de los tests agregados.. Status: pending

#### S4.T6.6 — Corrida de cierre: suite completa de curriculum-mapping incluido el CRUD de 1756 y competencyAlignmentSchemaAdditions.test.js, más npm run sync y codegen con verificación de cero drift y de que los artefactos copiados a core quedan fuera del commit. Reporte con suites, totales (ejecutados/pasados/fallidos) y clasificación introducido vs preexistente vs hallazgo NO-bug.
Contrato: rollback: Si el sync dejó drift, restaurar los workspaces de core desde HEAD y re-sync desde el mod fuente.. Status: pending

#### S5.T1 — Resolver de vía masiva: aplicar un destino (developmentLevelId + tipo) a N asignaturas en una transacción, con troceo en el backend siguiendo matrixAdoption.resolver.js:246-300, par resolver + .schema.graphql con extend type Mutation, y resultado tipado que devuelve aplicadas y salteadas con motivo por ítem (duplicado, fuera del plan/matriz, regla no cumplida). Validación: tests de lote mixto y de lote grande.
Contrato: rollback: Borrar el par resolver + schema y correr npm run sync; la UI de vía masiva queda sin montar.. Status: pending

#### S5.T2 — UI de la vía masiva en el editor: selección de asignaturas, elección del destino y panel de resultado que lista las salteadas con código, nombre y motivo. Atoms del layout-library, sin literales (todo por $t() contra lang/ del mod), un solo .vue por carpeta de modsComponents (RULE-mods-011/014/015); CSS en css/3-component/ (RULE-mods-016).
Contrato: rollback: Borrar la carpeta del componente y sus keys de lang, correr npm run sync y touch suite/vueform.config.ts si aplica (RULE-mods-021).. Status: pending

#### S5.T3 — Tests de la vía masiva y de paridad: lote válido, lote con duplicados, ítem fuera del plan, fallo de escritura con reversión total, lote de 200 con troceo sin timeout, y suite de paridad MCP completa. Reporte con totales y clasificación de fallos.
Contrato: rollback: git checkout de los tests agregados.. Status: pending

#### S6.T1 — Extender el test de paridad MCP para cubrir contributionPercentage: aserta que el campo está en la vía gobernada y deja asentado el hueco actual de la vía genérica, de modo que el test deba actualizarse cuando se cierre con blockGenericMutation.
Contrato: rollback: git checkout del archivo de test de paridad.. Status: pending

#### S6.T2 — Barrido de fidelidad: eliminar del codigo, copys y documentacion del editor toda mencion a drag, arrastrar, draggable o "equivalente por teclado", y a un panel lateral de detalle de tributacion; dejar la redaccion en terminos de seleccion + click y de CompetencyAlignmentDetailModal.
Contrato: rollback: Revertir el commit del barrido de copys y documentacion; no afecta comportamiento en runtime.. Status: pending

#### S7.T1 — Tests de fidelidad de la UI nombrando los componentes reales: (a) el detalle y el peso se editan en CompetencyAlignmentDetailModal y no existe panel lateral de detalle; (b) PlanSubjectsPanel se monta solo en el editor, nunca en la pestana solo lectura; (c) ambos modos del editor usan CompetencyAlignmentGridTable y no existe CompetencyLevelGrid; (d) la pestana solo lectura no renderiza selector de asignatura y si el boton "Tributar".
Contrato: rollback: git revert del commit de la task: se quitan los tests agregados; no afecta codigo de produccion.. Status: pending
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
## Sessions

### Session 1 · T1 · open

**Tasks:**
- [ ] S1.T1
- [ ] S1.T2
- [ ] S1.T3

**Gate (auto)**: Peso validado de punta a punta en el backend gobernado: el validador de CompetencyAlignment acepta contributionPercentage como string en [0,100] con 2 decimales sin truncar y rechaza cualquier valor en filas Develops (R-6), con la clave de grupo (planId, competencyNodeId, developmentLevelId) explicita. Se revisa corriendo la suite unitaria del validador (rango, precision, no truncado, los tres tipos, mensaje por fila con indice) y npm run sync sin drift.

### Session 2 · T1 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T1.1
- [ ] S2.T1.2
- [ ] S2.T1.3
- [ ] S2.T1.4
- [ ] S2.T1.5
- [ ] S2.T2
- [ ] S2.T3

**Gate (auto)**: El guardado de una matriz es un upsert de conjunto transaccional: se ejecuta la mutacion de batch para un (planId, matriz) y se observa que reemplaza el conjunto, retira solo lo del scope planId + competencias de la matriz, no toca otra matriz adoptada ni las filas fuera de diseno, revierte entero ante una fila invalida, deriva planId server-side, deja una sola entrada de historial y rechaza un RBAC sin create+modify+delete. Se revisa con la suite de integracion del batch (incluida la regresion del CRUD de 1756) y sync/codegen sin drift ni artefactos commiteados.

### Session 3 · T2 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T1.1
- [ ] S3.T1.2
- [ ] S3.T1.3
- [ ] S3.T1.4
- [ ] S3.T1.5
- [ ] S3.T2
- [ ] S3.T3
- [ ] S3.T4
- [ ] S3.T5
- [ ] S3.T6
- [ ] S3.T7
- [ ] S3.T7.1
- [ ] S3.T7.2
- [ ] S3.T8
- [ ] S3.T9

**Gate (auto)**: Editor de tributacion por competencia usable end-to-end: la pestana 'Tributacion' del plan queda solo lectura sin selector de asignatura y con el boton 'Tributar' que abre el editor (panel lateral PlanSubjectsPanel + CompetencyAlignmentGridTable + CompetencyAlignmentDetailModal). Se revisa en pantalla: eligiendo una asignatura queda el chip 'EN MANO', los destinos validos muestran '+ Asignar aca' y al hacer click se crea o mueve la tributacion (sin drag; sin nada en mano el '+' queda atenuado con su aviso), el modal abre en solo lectura con nivel/tipo glosados y pie 'Editar en tributacion' + 'Listo', y en edicion con los segmentados, el bloque 'Peso dentro de <nivel>' con input %, badge 'REPARTO AUTOMATICO', indicador '<N> evalua · suma <S>%' y 'Repartir en partes iguales' (ausente en filas Desarrolla), guardando por la mutacion de batch de la etapa 2. Verificado ademas por los tests de componente del modal y de interaccion (sin atributos ni handlers de arrastre).

### Session 4 · T2 · open

**Tasks:**
- [ ] S4.T1
- [ ] S4.T2
- [ ] S4.T3
- [ ] S4.T4
- [ ] S4.T4.1
- [ ] S4.T4.2
- [ ] S4.T5
- [ ] S4.T6
- [ ] S4.T6.1
- [ ] S4.T6.2
- [ ] S4.T6.3
- [ ] S4.T6.4
- [ ] S4.T6.5
- [ ] S4.T6.6

**Gate (auto)**: Modo 'Por malla' del editor operativo sobre la misma grilla y la misma via gobernada: el panel lateral 'COMPETENCIAS DE LA MATRIZ' pone una competencia en mano con su selector de nivel, las cards de asignatura aparecen agrupadas por periodo y ordenadas por position (incluido el caso sin periodo), '+ Asignar aca' asigna y deja el chip de tributacion con confirmacion, y ambos modos emiten el mismo payload de batch para (planId, matriz). Se revisa en pantalla y con los tests del modo por malla, del helper weights.ts y del guardado unico por batch desde ambos modos, mas la verificacion de que no quedo componente de grilla paralelo ni import de CurriculumMesh.

### Session 5 · T2 · open

**Tasks:**
- [ ] S5.T1
- [ ] S5.T2
- [ ] S5.T3

**Gate (auto)**: Via masiva viva: desde 'Varias' en una card o celda de destino se eligen varias asignaturas y un destino (nivel + tipo), se aplica en una sola transaccion con troceo en el backend y el panel de resultado lista las aplicadas y las salteadas con codigo, nombre y motivo. Se revisa en pantalla y con los tests de lote valido, lote con duplicados, item fuera del plan, fallo con reversion total y lote de 200 sin timeout.

### Session 6 · T1 · open

**Tasks:**
- [ ] S6.T1
- [ ] S6.T2

**Gate (auto)**: Cierre verificable: el test de paridad MCP cubre contributionPercentage y deja asentado el hueco de la via generica; el editor no contiene mencion alguna a drag/arrastrar/draggable/'equivalente por teclado' ni a un panel lateral de detalle en codigo, copys ni documentacion. Se revisa con la suite completa de curriculum-mapping en verde (CRUD de 1756 incluido), la suite de paridad MCP, el grep de fidelidad sin resultados y npm run sync/codegen sin drift con los artefactos fuera del commit.

### Session 7 · T0 · open

**Tasks:**
- [ ] S7.T1
