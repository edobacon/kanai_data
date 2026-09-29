---
id: TICKET-150
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1770
tier: T3
module: curriculum-design
autopilot: manual
story_points:
  estimated: 2
  executed: 2
---

## Objetivo

Implementar el guard que impide **publicar un plan de estudios** (transición del plan de Aprobado a Vigente) si algún grupo de pesos de tributación no suma 100. Es el requerimiento D1 de UPONE-1770, que salió del alcance de TICKET-149 (cm-interno) por ser cross-mod hacia curriculum-design.

Se implementa como **solución interina en curriculum-design** (opción B), **aprobada por plataforma/core** como puente "por deprecar" hasta que exista el motor de reglas del core (BRE). El alcance parcial es **intencional** y está documentado. Ver decisión completa: `DECISION-guard-publicacion-interino-y-retiro-con-BRE` (KB sp11).

## Contexto

- **El caso:** al publicar, cada grupo de pesos debe sumar 100. Grupos de matrices con consolidación `Max` eximidos; solo `Evaluates`/`Both` participan (R-6). Requerimiento verificado del negocio (maqueta, plan de división, descripción de UPONE-1770). Hoy es un criterio de aceptación de 1770 que no se cumple.
- **Por qué cross-mod:** el momento (publicar) vive en curriculum-design; el dato (los pesos, en `CompetencyAlignment`) vive en curriculum-mapping.
- **Por qué interino y no core ahora:** la solución correcta es de core y el core la está construyendo (BRE, motor de reglas, en desarrollo). No se debe construir un mecanismo paralelo. El lead de plataforma aprobó explícitamente el resolver custom interino como "función por deprecar" (respuesta 2026-09-23).
- **Guardarraíl previo (149):** el editor ya impide que un grupo SUPERE 100 (tope dinámico client-side, Adenda 2 de 149). Este ticket agrega la garantía dura de que un grupo sea EXACTAMENTE 100 al publicar. Son complementarios.

## Alcance (dentro, curriculum-design)

1. **Guard `assertCurriculumWeightsOnPublish`** sumado a la cadena de asserts pre-delegación del override de `updateInstance` en `logic/polymorphicUpdate.resolver.js` (rama no-rt, al lado de `assertActivityEvaluationsOnPublish`, UPONE-1381). No-op salvo `objectType = Curriculum` y transición de `status` a `Active`.
2. **Lógica del guard:** lee las tributaciones del plan por Prisma (`planId = curriculumId`), agrupa por `(planId, competencyNodeId, developmentLevelId)`, exime los grupos cuya matriz tiene `courseAggregationMode = Max`, suma `contributionPercentage` de las filas `Evaluates`/`Both` (R-6), y aborta con error claro si un grupo medible no da 100.
3. **Gate por TENANT, no por usuario:** el guard aplica solo si el cliente tiene tributación (existencia del modelo `CompetencyAlignment`; patrón defensivo ya usado en cd). **NO** gatear por el permiso `competencyalignment:view` del usuario que publica (ver "Puntos débiles / cuidados"). La lectura de cm es por Prisma directo (chequeo interno de integridad).
4. **Marca de interino:** el guard queda comentado como deprecable, con referencia a `DECISION-guard-publicacion-interino-y-retiro-con-BRE` y al BRE.
5. **Aporte al BRE:** dejar registrado el caso como requerimiento para el motor de reglas (agregado cross-table evaluado en una transición). No es desarrollo de este ticket; es un seguimiento a coordinar con el equipo del BRE (Van).

## Fuera de alcance (intencional)

- **G-2 (cerrar la escritura genérica del peso):** este guard frena la publicación, NO la escritura. Un peso inválido escrito por GraphQL directo o el bulk del core sigue siendo posible; el error aparece al publicar. Lo cierra el BRE, no este ticket.
- **D4 (paridad MCP del peso):** sigue como deuda aparte (ya hay un item de test en 149).
- **El mecanismo de core (BRE):** no se construye acá.
- Cualquier generalización del guard (debe quedar mínimo y aislado para retirarlo fácil).

## Punto de enganche (verificado 2026-09-23)

- `curriculum-design/logic/polymorphicUpdate.resolver.js`, rama `!RT_PATTERN`: cadena de `assert*({objectType, data, id, prisma})` que corre ANTES de `generic.updateInstance`. Ahí ya vive `assertActivityEvaluationsOnPublish` (mismo patrón: suma exacta al publicar un Activity). El guard nuevo es una línea más en esa cadena.
- Cobertura: cd posee `updateInstance` para todo el server, así que el guard dispara para publicaciones por UI, API y bulk-edit del core (todas pasan por `updateInstance` sobre `Curriculum`).
- Transición: `curriculum-design/objects/Curriculum.json:126-134` (`{from: Approved, to: Active, requiredCapabilities: [curriculum:publish]}`).

## Criterios de aceptación

- Publicar un plan con un grupo medible que no suma 100 se rechaza con error claro; el plan NO pasa a Vigente.
- Un grupo cuya matriz tiene `courseAggregationMode = Max` queda eximido y no frena la publicación.
- Solo `Evaluates`/`Both` participan de la suma (R-6); `Develops` no.
- En un tenant SIN tributación (sin el modelo `CompetencyAlignment`), publicar es no-op: el guard no toca cm ni bloquea.
- El gate es por tenant (existencia del modelo), no por el permiso de lectura del usuario que publica.
- El guard es no-op para cualquier `objectType` distinto de `Curriculum` y para transiciones distintas de Aprobado→Vigente.
- La suite de curriculum-design queda verde; `sync`/`codegen` sin drift.

## Puntos débiles conocidos y aceptados (intencional)

Registrados en detalle en `DECISION-guard-publicacion-interino-y-retiro-con-BRE`:
- No cierra la escritura de atrás (G-2): ventana en que un peso puede quedar inconsistente en la base hasta el intento de publicar. Aceptado como puente (el bloqueo del MCP acota el vector).
- Estrena el acoplamiento curriculum-design → curriculum-mapping (temporal; es un read por Prisma, no un ciclo de imports).
- Conocimiento de cm hardcodeado en cd + duplicación parcial de lógica que ya existe en cm.
- **Cuidado clave:** el gate debe ir por tenant, no por el permiso del usuario que publica (gatear por `competencyalignment:view` abre un hueco o un bloqueo falso).
- Es descartable: al llegar el BRE se retira.

## End-state y disparador de retiro

Cuando el BRE esté disponible y soporte el agregado cross-table en una transición:
1. Registrar la regla de suma en el BRE desde curriculum-mapping (dueño), con exención `Max` y R-6.
2. Retirar este guard interino de curriculum-design.
3. Verificar el bloqueo por todas las puertas (incluida la escritura, cerrando G-2) y que el MCP ya no duplica la regla (D4).

## Dependencias

- **Deriva de UPONE-1770 / TICKET-149** (peso gobernado + modelo, ya en develop por 1769 y 149). El dato a sumar existe.
- **No depende del BRE** (es el puente hasta que llegue).

## Reglas a respetar

R-6 (solo Evaluates/Both pesan); exención `Max`; scope de grupo `(planId, competencyNodeId, developmentLevelId)`; guard mínimo y aislado (deprecable); no importar componentes cross-mod; sin CRUD generic para la lectura (Prisma directo interno).

## Referencias (KB sp11)

- Decisión + puntos débiles + cobertura BRE + disparador: `DECISION-guard-publicacion-interino-y-retiro-con-BRE`.
- Análisis del caso y alternativas: `Pendiente cross-mod - Guard de suma al publicar el plan (D1, derivado de 1770)`.
- Artefacto de presentación a core: `Guard de publicación del plan`.
- Por qué D1 salió de 149: `UPONE-1770 - cierre de alcance y correcciones`.

## Adendas al request

### Adenda 1 - 2026-09-23 - Eduardo (dev)

Correccion de Dependencias: la columna contributionPercentage y su indice de grupo SI estan en develop (UPONE-1769), pero la escritura gobernada del peso desde el editor (UPONE-1770 / TICKET-149) NO esta en develop todavia: vive en la rama feat/UPONE-1770-tributacion-peso-del-eje-1 de curriculum-mapping, sin push ni merge (HEAD c61029f al 2026-09-23). Consecuencia: este ticket se puede desarrollar y testear ya (la columna existe), pero NO debe llegar a develop antes que 1770. Si llegara antes, ningun plan con tributaciones medibles (Evaluates/Both) se podria publicar hasta que 1770 se mergee, porque sus grupos sumarian 0 y el guard los rechazaria. Orden de merge requerido: 1770 antes que este ticket, o ambos a la par.

**Motivo**: El texto original de Dependencias decia que el dato ya estaba en develop por 1769 y 149; 149 esta cerrado en Kanai pero su rama no esta mergeada.

### Adenda 2 - 2026-09-23 - Eduardo (dev)

Hechos verificados contra develop (2026-09-23) y reglas definidas por el dev. Reemplazan lo que el request original asumia.

1. DOS PUNTOS DE ENGANCHE (no uno). El formulario de edicion del plan (config/layouts/default_Curriculum_edit.json) guarda, incluido el cambio de estado, por la mutation propia updateCurriculumWithRecordType (logic/curriculum-update.resolver.js), que carga directo el updateInstance del core (loadGenericInstanceMutation, lineas 74-90) y NO pasa por la cadena de asserts de polymorphicUpdate.resolver.js. El guard se cablea en los DOS lugares: (a) updateCurriculumWithRecordType, antes de delegar (mismo precedente que assertNoActiveDependentsOnRevert, que ya esta en ambos); (b) la rama !RT_PATTERN de polymorphicUpdate.resolver.js, al lado de assertActivityEvaluationsOnPublish (cubre updateInstance generico, API, MCP y edicion masiva del core). En (a) el id viene en data.id.

2. OBJECTTYPE. Un plan llega como la base Curriculum o como el alias rt__Plan__curriculum / rt__Minor__curriculum (el alias cae en la rama !RT_PATTERN). El guard aplica a los tres; no-op para cualquier otro objectType.

3. MODELO REAL (curriculum-mapping). Tributacion: modelo Prisma competencyAlignment, campos planId, competencyNodeId, developmentLevelId, contributionType (Develops/Evaluates/Both) y contributionPercentage (string). El modo de consolidacion NO esta en la tributacion ni en la competencia: courseAggregationMode vive en el satelite de la matriz rt__Matrix__competencynode (FK competencynodeId = id de la matriz), not_null, enum WeightedAvg/Max, default WeightedAvg. Para saber si un grupo esta eximido: competencyAlignment.competencyNodeId -> competencyNode.matrixId -> rt__Matrix__competencynode.courseAggregationMode. Lecturas acotadas: una por tabla, en lote, por planId (sin N+1 por grupo).

4. REGLA AL PUBLICAR (definida por el dev). Por cada grupo medible (planId, competencyNodeId, developmentLevelId) cuya matriz consolida por WeightedAvg: (i) TODA fila Evaluates o Both debe tener peso cargado (vacio/null = error de esa fila), y (ii) la suma de sus pesos debe ser EXACTAMENTE 100. La suma se hace en centesimos enteros (el peso admite hasta 2 decimales), no en coma flotante ni con tolerancia. Grupos de matrices Max y filas Develops no participan.

5. NOTIFICACION DE ERRORES (verificado en layout develop). El rechazo se lanza como GraphQLError con extensions.code = VALIDATION_FAILED y extensions.fieldErrors = [{ field, message, messageKey?, params }], UN item por problema (grupo que no suma 100, con la suma obtenida y lo que falta o sobra; y cada fila Evaluates/Both sin peso), identificando competencia (codigo y nombre), nivel de desarrollo, matriz y asignatura (codigo y nombre) segun corresponda. RecordDetail los consume con useBackendValidationErrors y los muestra en FormErrorSummary (lista + contador en la pestana); un item anclado a field "status" marca el selector de Estado. El message del error tambien lleva la lista en texto para API/MCP; el core ya preserva extensions.fieldErrors en la edicion masiva (instance.resolver.js:5962). NO usar un Error plano (como EVALUATION_WEIGHT_MISMATCH): cae al modal generico "An unexpected error occurred" y esconde la lista.

6. CONSULTA DE ANTICIPACION (opcion B del dev). Se agrega la query de solo lectura validateCurriculumAlignmentWeights(planId) en curriculum-design (precedente: validateActivityEvaluations), que devuelve la MISMA lista estructurada de problemas sin intentar publicar; el guard y la query comparten una unica funcion de calculo. Capability: la de lectura del plan en curriculum-design. Queda disponible para MCP y para que a futuro el editor de tributacion marque las celdas con problemas (esa UI es un ticket aparte en curriculum-mapping, fuera de este). La query tambien es interina y se retira con el guard al llegar el BRE.

**Motivo**: Revision del plan contra el codigo real: el request asumia un unico punto de enganche que el formulario del plan no atraviesa, y dejaba sin definir la regla de filas sin peso y como se notifican los errores.

### Adenda 3 - 2026-09-24 - Eduardo (dev)

Ficha MCP de la consulta de anticipacion (RULE-mcp-015): la query validateCurriculumAlignmentWeights(planId) se refleja en el asistente MCP del mod (ai/tools.js de curriculum-design), siguiendo el precedente de la ficha cd_validate_activity_evaluations: herramienta de solo lectura que devuelve la lista de problemas de pesos de tributacion del plan (grupos que no suman 100, filas Evaluates/Both sin peso, pesos mal formados) para anticipar el rechazo antes de publicar. Mismo permiso que la query (lectura del plan). Es interina igual que la query y se retira junto con ella (se suma a la lista de retiro).

**Motivo**: Al cerrar la Sesion 1 se detecto que la capacidad nueva no estaba reflejada en el MCP, a diferencia de su precedente; el dev pidio sumarla en la Sesion 2.

### Adenda 4 - 2026-09-24 - Eduardo (dev)

Correccion de la cobertura declarada (review de kn-dredd 2026-09-24, 3/3 jueces, confirmado por re-verify): la edicion masiva del core (updateBulkInstances, object-manager instance.resolver.js:6321) NO pasa por el guard. Llama al updateInstance interno del core (objeto instanceMutation), no al Mutation.updateInstance que curriculum-design sobrescribe, asi que no corre ninguno de los asserts de la rama !RT_PATTERN (ni este guard ni sus hermanos). La lista de planes permite cambiar el Estado en linea (RecordList usa updateBulkInstances y default_Curriculum_list.json no bloquea la edicion inline de status), y tambien se alcanza por GraphQL directo. Queda como VENTANA CONOCIDA del interino (cuarta, junto a G-2, plan Vigente editado despues y la lectura fuera de la transaccion): la cierra el BRE del core, que segun la decision de plataforma corre en la ranura pre-escritura para toda puerta, incluido el bulk del core. Se reemplaza la afirmacion del request (seccion Punto de enganche) de que el guard dispara para el bulk-edit del core. Documentado en docs/architecture/server-side-integrity.md (I6) y en la nota de ventanas del KB sp11.

**Motivo**: El request afirmaba que cd posee updateInstance para todo el server y que por eso el bulk-edit del core quedaba cubierto; la review demostro que es falso.

### Adenda 5 - 2026-09-24 - Eduardo (dev)

Correcciones de la review de kn-dredd (2026-09-24), decididas por el dev (A/A/A), en una Sesion 3 del guard:
1. PERMISO ANTES DE LEER: assertCurriculumWeightsOnPublish verifica curriculum:modify (checkObjectPermissions(context, 'Curriculum', 'modify'), mismo cargador dual-path que la query) ANTES de leer el status o la tributacion. Sin permiso: el error de autorizacion estandar, sin detalle de tributacion. Es la misma verificacion que el core hace despues en updateInstance, asi que no cambia nada para quien tiene permiso.
2. FORMATO DEL PESO ALINEADO CON CURRICULUM-MAPPING: el guard deja de usar una expresion regular estricta y usa la misma semantica que el validador de escritura de cm (hasWeightPrecision/isWeightInRange de validateCompetencyTree.js): Number(valor), finito, en [0, 100], con hasta 2 decimales usando la misma tolerancia (1e-6); recien entonces se convierte a centesimos con Math.round para sumar en enteros. Pesos como '.5', '50.' o '33.340000000000003' que cm acepta y guarda dejan de marcarse como INVALID_WEIGHT. Lo que cm rechazaria sigue siendo INVALID_WEIGHT.
3. SOLO LO QUE LA PERSONA PUEDE VER Y EDITAR: el guard (y por lo tanto la query y la ficha, que usan la misma funcion de calculo) solo evalua filas cuya competencia existe y pertenece a una matriz con adopcion VIGENTE para el plan, con la misma definicion de vigencia que cm (MatrixAdoption con competencyNodeId = matriz y curriculumId = plan, status Adopted, effectiveFrom <= hoy y en fuerza; Exempt no cuenta). Filas de matrices no adoptadas o vencidas, o de competencias que ya no existen, no bloquean la publicacion (la limpieza de huerfanas sigue en UPONE-1772). La lectura de adopciones es en lote (numero constante de consultas).

**Motivo**: Review de kn-dredd: el guard exponia datos antes del RBAC, rechazaba pesos que cm acepta y podia bloquear un plan por filas que la persona no puede ver ni corregir.
