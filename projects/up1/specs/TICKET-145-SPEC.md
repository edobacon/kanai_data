---
id: TICKET-145-SPEC
project: up1
ticket: TICKET-145
status: approved
---

# Migracion server-side de invariantes de malla de Curriculum Design (camino A) con validacion por pruebas

## Resumen ejecutivo

Se migra al servidor la logica de negocio de Curriculum Design que hoy vive solo en el cliente (casos A-CD-1..6) y se cierran las dos brechas parciales del resolver (A-CD-7 R0 progression por path rt, A-CD-8 R1 RBAC de objeto en createSyllabusOffering). Todo va al override de createInstance/updateInstance/delete del mod (camino A puro): el objeto queda en N0 y el motor generico del MCP pasa por el mismo gate. NO se hace: camino B (blockGenericMutation / repo mcp), Core Extensions de object-manager (requiresComment, enum RecordType), casos camino C (deriveLevel, guidedAdd, editEntryModal, blockSelect salvo que el gate de F0 los reclasifique), ni nueva superficie MCP. La logica client-side (.logic.ts) se conserva como pre-check de UX; no se borra. Se sabe que funciona por: unit del guard, integracion del resolver contra DB de test, y prueba de bypass cross-client (UI / updateInstance-deleteInstance generico con alias rt__ / up1_*_object del MCP) donde las tres vias deben rechazar; mas regresion de suite del mod, E2E del MCP y comparacion contra el baseline de comportamiento capturado en F0. Tamano estimado: 4 sesiones (T2/T3), ~10-12h. ADVERTENCIAS (fuera de alcance, no convertidas en REQ): (1) el ticket Jira UPONE-1757 esta declarado como diagnostico+spike y este ticket ejecuta la migracion real; falta avisar al PO (Esteban Cortes) o formalizar el ticket de ajuste. (2) A-CD-2 cambia la semantica de unicidad de (planId+period+position) a (planId+activityId): puede rechazar datos existentes de UPU; el REQ obliga a verificar contra datos reales antes de aplicar @@unique y a caer a guard aplicativo si hay colisiones. (3) BUG-curriculum-design-005 (bypass del guard de linaje por customEndpoint createCurriculumWithRecordType) es evidencia de que existen paths que no pasan por el override: la capa de bypass cross-client debe cubrirlos, pero corregir ese bug es otro ticket. (4) El techo de 4 sesiones se cumple, pero F0 (baseline+ambientes) y F6 (cierre) quedan comprimidas dentro de S1 y S4; si el gate de F0 reclasifica casos C a A, el request excede el techo y debe partirse.

## Requirements

### REQ-01 `confirmed`
> Fuente: request TICKET-145 seccion 'Fases > F0' y 'Contexto congelado'; curriculum-design/docs/architecture/curriculum-mesh-guards-prereqs.md:29

Baseline y gate de clasificacion (F0): antes de tocar codigo se refresca el watermark de curriculum-design (git fetch, revisar commits posteriores a 8a151e7) y de mcp (30a032a), se materializa el submodulo mods/curriculum-design, se levantan los ambientes (:4000 object-manager/GraphQL, :3000 front suite, :4100 MCP online) con el login de test, y se ejecuta el gate de clasificacion A-vs-C sobre los casos ambiguos (deriveLevel, recalcPeriodPosition, guidedAdd, editEntryModal, blockSelect) con el criterio unico: si saltarse la regla corrompe datos es A, si solo degrada UX es C. Se captura el baseline de comportamiento observable de la malla como oraculo de no-regresion, sin agregar tests nuevos.

### REQ-02 `confirmed`
> Fuente: request TICKET-145 tabla de casos (curriculumMesh.logic.ts:362 -> override create/update/delete de planEntry, planEntry-batch:90-135); patron assertActivityNotInActivePlan citado en 'Patron a imitar'

A-CD-1 (F1): editar planEntry solo si el plan esta en Draft. El override de createInstance/updateInstance/delete de planEntry del mod rechaza con error tipado cualquier create, update o delete de un planEntry cuyo Plan (Curriculum) no este en estado Draft, tanto en la via single como en la batch (planEntry-batch), y por cualquier cliente (UI, updateInstance/deleteInstance generico con alias rt__, up1_*_object del MCP). La logica client-side curriculumMesh.logic.ts se conserva como pre-check de UX.

### REQ-03 `confirmed`
> Fuente: pedido de enmienda TICKET-145 punto 1 (reduccion de alcance a solo logica); request TICKET-145 tabla de casos (activityPicker.logic.ts:17); RULE-curriculum-design-005

A-CD-2 (F1): unicidad (planId, activityId) en planEntry implementada SOLO como guard aplicativo (Via B) en el override de createInstance/updateInstance de planEntry, single y batch. El guard detecta el duplicado contra las entradas ya persistidas del plan y tambien dentro del propio lote, y rechaza con el code de dominio del mod; el mensaje user-facing termina exactamente con 'Unique constraint failed on the fields: (`activityId`)' para mapear al friendly-error (RULE-curriculum-design-005). NINGUN cambio de esquema entra en este ticket: no se agrega el constraint @@unique([planId, activityId]) ni el indice de soporte @@index([planId, activityId]) ni migracion alguna; ese endurecimiento de modelo queda DIFERIDO a un analisis de modelo posterior. Limitacion explicita a documentar en el codigo y en el cierre: sin constraint, el invariante depende de que TODO write pase por el override (no cubre escritura directa a la DB ni un path futuro que saltee el override), y sin indice de cobertura la deteccion puede degradar a scan por plan en lotes grandes.

### REQ-04 `confirmed`
> Fuente: request TICKET-145 tabla de casos (editEntryModal.logic.ts:71 -> validacion de forma en create/update)

A-CD-4 (F1): validacion de forma de planEntry en create/update server-side. Una entrada marcada como electiva exige bloque (campo de bloque no nulo/no vacio) y el credito no puede ser negativo. El rechazo es tipado y aplica en single y batch por cualquier via.

### REQ-05 `confirmed`
> Fuente: request TICKET-145 tabla de casos (deletionImpact.logic.ts:238 -> guard en deletePlanEntriesBatch + delete single); RULE-curriculum-design-033; RULE-curriculum-design-037

A-CD-3 (F2): borrado seguro de planEntry. deletePlanEntriesBatch y el delete single rechazan con error tipado cuando el borrado dejaria requisitos insatisfacibles en la malla. La evaluacion del impacto reusa el ensamblado y el evaluador puro existentes (buildRequirementTree/assembleRequirementTree + evaluateRequirementTree.logic) de forma recursiva y fiel al arbol Y/O; esta PROHIBIDO aplanar el arbol a una lista (RULE-curriculum-design-033). La evaluacion es acotada: se resuelve por lote sobre el conjunto de requirements del plan afectado, no por fila ni con N+1 por entrada del lote.

### REQ-06 `confirmed`
> Fuente: pedido de enmienda TICKET-145 punto 2 (mantener la mutation como logica, sacar el indice del alcance); request TICKET-145 tabla de casos (recalcPeriodPosition.logic.ts:76); RULE-curriculum-design-041

A-CD-5 (F3): mutation dedicada movePlanEntry con renumerado transaccional, implementada SOLO como logica en el resolver del mod. Mover un planEntry de (period, position) a otro destino renumera las posiciones afectadas dentro de una unica transaccion: o se aplica todo o no se aplica nada. La convencion de position se normaliza explicitamente (CurriculumMesh es 0-based; no asumir la base de CompositeSectionTree, RULE-curriculum-design-041) y el renumerado es acotado al period origen y destino, no a toda la malla. NO se crea el indice @@index([planId, period, position]) ni ningun otro cambio de esquema, y el renumerado NO elimina ni crea constraints ni indices existentes; ese indice de apoyo queda DIFERIDO al analisis de modelo posterior. Bajo concurrencia, el unico enforcement son la transaccion y el guard aplicativo de REQ-03 (no hay constraint de unicidad): la limitacion se documenta como hallazgo.

### REQ-07 `confirmed`
> Fuente: request TICKET-145 tabla de casos (RichTextRenderer/sanitizeHtml.ts -> sanitizacion en el write del resolver)

A-CD-6 (F4, seguridad): sanitizacion HTML server-side del contenido de CustomSection. El create y el update del resolver sanitizan el HTML con una whitelist ANTES de persistir, de modo que el payload malicioso no llega a la DB por ninguna via (UI, generico, MCP). El render sanitizado client-side (RichTextRenderer/sanitizeHtml.ts) se mantiene como defensa en profundidad y no se borra.

### REQ-08 `confirmed`
> Fuente: request TICKET-145 tabla de casos (curriculum-update:112, RT_PATTERN:207 -> extender guard al path rt__Plan__curriculum); RULE-curriculum-design-032; RULE-curriculum-design-036

A-CD-7 R0 (F5): el guard que impide cambiar progression con malla no vacia se extiende al path rt. Hoy el guard vive en la rama !RT_PATTERN de polymorphicUpdate y se esquiva por el path rt__Plan__curriculum. Al extender el alcance se re-cablean los guards de dominio de esa rama para que corran tambien en la rama rt, sin romper el resto de guards ya cableados (assertCreditRangeOnUpdate, assertActivityNotInActivePlanOnUpdate, assertActivityEvaluationsOnPublish, assertNoActiveDependentsOnR...), y sin hacer upsert de la proyeccion rt en un update base-only (RULE-curriculum-design-036).

### REQ-09 `confirmed`
> Fuente: request TICKET-145 tabla de casos (syllabus-offering.resolver.js -> agregar withObjectAuth)

A-CD-8 R1 (F5): createSyllabusOffering agrega withObjectAuth. Hoy valida la sesion pero no aplica RBAC de objeto; se agrega el wrapper withObjectAuth siguiendo el patron ya usado por los demas resolvers del mod, de modo que un usuario autenticado sin la capability sobre el objeto sea rechazado.

### REQ-10 `confirmed`
> Fuente: request TICKET-145 seccion 'Estrategia de validacion' punto 3 y 'Principio rector'; BUG-curriculum-design-005 (precedente de bypass por customEndpoint)

Garantia cross-client (transversal a F1-F5): para cada invariante migrado, la misma operacion prohibida se intenta por las tres vias — (a) UI, (b) updateInstance/deleteInstance/createInstance generico con alias RecordType rt__, (c) up1_create/update/delete_object del MCP — y las tres deben rechazar con el mismo code de dominio. Si (b) o (c) pasan, la regla quedo en un *Validated esquivable y debe moverse al override o declararse camino B (coordinado con UPONE-1758). El veredicto por objeto se documenta al cierre: con el invariante en el override el objeto queda en N0 y blockGenericMutation resulta innecesario para cd.

### REQ-11 `confirmed`
> Fuente: request TICKET-145 seccion 'Estrategia de validacion' puntos 4-6 y 'Criterio de no-regresion checkeable'; 'Ya server-side (red de regresion, no se toca)'

No-regresion de comportamiento (transversal, F0-F6): las operaciones legitimas siguen produciendo el mismo resultado observable que el baseline capturado en F0 (mismos inputs => mismo resultado), las operaciones que la UI ya bloqueaba siguen bloqueadas (ahora respaldadas por backend), la suite server-side existente del mod (incluida planEntry-batch) sigue verde, y ninguna capacidad expuesta cambia en silencio. La logica client-side (.logic.ts) se conserva intacta como pre-check de UX en todos los casos migrados.

### REQ-12 `confirmed`
> Fuente: pedido de enmienda TICKET-145 punto 3 (regla transversal: sin cambios de esquema/modelo) y punto 4 (verificaciones de datos de modelo pasan a hallazgo)

Alcance solo-logica (transversal, F0-F6): ninguna tarea de ninguna fase edita archivos de esquema Prisma (prisma/**/schema.prisma) ni crea, aplica o versiona migraciones de base de datos. Todo invariante de este ticket se sostiene con logica en los resolvers/overrides del mod. Si una fase descubre que un invariante no se puede sostener solo con logica (o que el costo de query lo exige), el resultado se REPORTA como hallazgo para el analisis de modelo posterior (con la evidencia y la recomendacion concreta de constraint/indice) y NO se implementa el cambio de esquema dentro de este ticket.

### REQ-13 `confirmed`
> Fuente: pedido de enmienda TICKET-145 punto 5 (no hay cambios visuales/UI; la verificacion visual no aplica)

Sin superficie visual (transversal): este ticket es backend puro (resolvers/overrides del mod y sus tests). No introduce ni modifica UI, maqueta, tokens de diseno ni Storybook, por lo que no aplica verificacion visual ni comparacion contra maqueta. La unica observacion de UI que se hace es la comparacion de comportamiento contra el baseline de F0 exigida por REQ-11, que verifica resultado observable, no presentacion.
## Tasks

#### S1.T1 — F0: refrescar watermark de curriculum-design (git fetch, listar y clasificar commits posteriores a 8a151e7) y de mcp (30a032a); materializar el submodulo mods/curriculum-design; por cada caso A-CD-1..8 dejar registrado si su regla ya migro (H1) o sigue vigente. Usar worktree de solo lectura para leer, sin checkout/pull sobre checkouts vivos.
Contrato: rollback: Ninguna mutacion de codigo: eliminar el worktree de solo lectura y el documento de watermark. Sin efecto sobre repos vivos.. Status: done

#### S1.T2 — F0: levantar ambientes (:4000 object-manager/GraphQL, :3000 front suite, :4100 MCP online), login de test con eduardo.bacon+clerk_test@uplanner.com + OTP 424242, y capturar el baseline de comportamiento observable de la malla (create/update/move/delete de planEntry en plan Draft y en plan Active, preview de impacto de borrado, render de CustomSection) como oraculo de no-regresion, en un documento con inputs y salidas concretas.
Contrato: rollback: Bajar los procesos de los tres puertos y descartar el documento de baseline. Sin cambios en el repo.. Status: done

#### S1.T3 — F0: ejecutar el gate de clasificacion A-vs-C sobre los casos ambiguos (deriveLevel, recalcPeriodPosition, guidedAdd, editEntryModal, blockSelect) con el criterio 'si saltarlo corrompe datos => A'; dejar veredicto y justificacion de una linea por caso. Los reclasificados a A NO se agregan al plan: se reportan como advertencia de alcance.
Contrato: rollback: Descartar el documento de clasificacion. Sin cambios de codigo.. Status: done

#### S1.T4 — F0: fijar el verde de partida ejecutando la suite server-side del mod y el harness E2E del MCP sin agregar tests nuevos; reportar suites, totales y clasificar cada fallo como preexistente. Un fallo preexistente que bloquee el flujo detiene la fase y se reporta con archivo/linea/sugerencia.
Contrato: rollback: No aplica (solo ejecucion de tests). Descartar el reporte.. Status: done

#### S2.T1 — F1: implementar los tres guards de estado y forma de planEntry en el override de createInstance/updateInstance/delete que ya corre para planEntry (planEntry-batch:90-135 y single), sin resolver paralelo, imitando el patron de assertActivityNotInActivePlan y de los overrides vigentes (polymorphicUpdate, sectionValidation). La task padre no se ejecuta directa: se completa cuando terminan sus subtasks.
Contrato: rollback: Revertir el commit de la fase F1: los guards desaparecen del override y el comportamiento vuelve al pre-check solo-client. La logica client-side nunca se toco.. Status: done

#### S2.T1.1 — Guard A-CD-1 (plan en Draft): funcion pura assert que recibe el estado del plan y lanza error tipado si no es Draft, con resolucion fail-closed cuando el plan no se puede resolver; cablearla en create, update y delete del override, single y batch.
Contrato: rollback: Revertir el commit del guard; el override queda como estaba y las operaciones vuelven a depender del pre-check client-side.. Status: done

#### S2.T1.2 — Guard A-CD-2 (unicidad planId+activityId) implementado SOLO como guard aplicativo en el override de create/update de planEntry (single y batch), SIN tocar el esquema: detectar el duplicado contra las entradas ya persistidas del plan y tambien dentro del propio lote, rechazar con el code de dominio del mod y formatear el mensaje terminando exactamente en 'Unique constraint failed on the fields: (`activityId`)' (RULE-curriculum-design-005). NO aplicar @@unique([planId, activityId]) ni el indice de soporte ni migracion alguna: el endurecimiento de modelo queda diferido al analisis posterior. Dejar en el codigo y en el PR la nota de limitacion: sin constraint el invariante depende de que todo write pase por el override, y sin indice de cobertura la deteccion puede degradar a scan por plan en lotes grandes.
Contrato: rollback: Revertir el commit del guard: el override queda como estaba y la unicidad vuelve a depender del pre-check client-side. No hay migracion ni cambio de esquema que revertir.. Status: done

#### S2.T1.3 — Guard A-CD-4 (forma): validacion en create y update de que una entrada electiva tiene bloque no nulo y no vacio, y de que el credito es >= 0 (0 valido, negativo rechazado); error tipado, aplica en single y batch.
Contrato: rollback: Revertir el commit del guard de forma; la validacion vuelve a existir solo en editEntryModal.logic.ts.. Status: done

#### S2.T1.4 — Verificar que los tres guards viven en el override y no en un *Validated paralelo, y que el objeto planEntry queda en N0; dejar constancia del nivel alcanzado para el veredicto de cierre.
Contrato: rollback: No aplica (verificacion). Si se detecta un *Validated esquivable, revertir el cableado y mover la logica al override.. Status: done

#### S2.T2 — Tests de F1: unit de los tres guards puros con valores concretos (Draft/Active, duplicado/no duplicado, electiva sin bloque, credito 0 y -1), integracion del resolver contra DB de test cubriendo create/update/delete en single y batch, y matriz de bypass cross-client (UI / generico con alias rt__ / up1_*_object) donde las tres vias rechazan. Incluir el caso de control con guard removido que debe hacer fallar el test. Correr la regresion de planEntry-batch y el E2E del MCP.
Contrato: rollback: Revertir el commit de tests; los tests nuevos desaparecen y la suite vuelve al conteo de F0.. Status: done

#### S2.T2.1 — Unit del guard A-CD-1: plan con status Draft devuelve ok; status Active lanza el error tipado con el code de dominio esperado; plan irresoluble (planId inexistente o nulo) lanza por fail-closed. Assertions sobre el code concreto, no solo sobre 'lanza'.
Contrato: rollback: Revertir el commit de este archivo de test; el resto de la suite queda intacta.. Status: done

#### S2.T2.2 — Unit del guard A-CD-2: activityId no presente devuelve ok; activityId ya presente en el plan lanza; payload de lote con dos entradas de la misma activityId lanza por duplicado intra-lote; la misma activityId en otro plan no lanza. Assertion de que el mensaje TERMINA exactamente en 'Unique constraint failed on the fields: (`activityId`)'.
Contrato: rollback: Revertir el commit de este archivo de test.. Status: done

#### S2.T2.3 — Unit del guard A-CD-4: electiva con bloque valido y credito 6 ok; electiva con bloque nulo lanza; electiva con bloque string vacio lanza; credito 0 ok; credito -1 lanza; no-electiva sin bloque ok.
Contrato: rollback: Revertir el commit de este archivo de test.. Status: done

#### S2.T2.4 — Integracion single contra DB de test: en plan Draft, create/update/delete de planEntry persisten (verificar id y valores leidos de DB); en plan Active, los tres rechazan con code de dominio, el count de planEntry no cambia y el registro conserva sus valores previos campo por campo. Incluir el duplicado de activityId y la electiva sin bloque por el path single.
Contrato: rollback: Revertir el commit de este archivo de test.. Status: done

#### S2.T2.5 — Integracion batch contra DB de test: deletePlanEntriesBatch con 3 ids en plan Active rechaza el lote completo y los 3 planEntry siguen existiendo; alta en lote con dos entradas de la misma activityId rechaza sin insertar ninguna; alta en lote con una electiva sin bloque rechaza el lote completo (atomicidad verificada por count antes/despues).
Contrato: rollback: Revertir el commit de este archivo de test.. Status: done

#### S2.T2.6 — Matriz de bypass cross-client de A-CD-1, A-CD-2 y A-CD-4: la misma operacion prohibida por (a) UI, (b) createInstance/updateInstance/deleteInstance generico con alias rt__Plan__planEntry y (c) up1_create/update/delete_object del MCP; las 9 celdas deben rechazar con el mismo code de dominio. Registrar la tabla resultante como evidencia.
Contrato: rollback: Revertir el commit de los tests de matriz y descartar la tabla de evidencia.. Status: done

#### S2.T2.7 — Caso de control: con el guard de A-CD-1 deliberadamente desactivado en el override, la via generica (b) pasa y el test de bypass FALLA. Deja demostrado que la prueba detecta la regresion; restaurar el guard al terminar y verificar que la suite vuelve a verde.
Contrato: rollback: Restaurar el guard desactivado (revertir el cambio local de control); si quedo dato creado por la via que paso, borrarlo de la DB de test.. Status: done

#### S2.T2.8 — Regresion de F1: correr la suite server-side del mod (incluida planEntry-batch) y el harness E2E del MCP, comparar el conteo contra el verde de partida de F0 y comparar el flujo legitimo de la UI (crear/editar/borrar planEntry en plan Draft) contra el baseline. Clasificar cada fallo como introducido vs preexistente.
Contrato: rollback: No aplica (solo ejecucion). Descartar el reporte de regresion.. Status: done

#### S2.T3 — Test de control de la Via B para A-CD-2: con el guard de unicidad desactivado, insertar por integracion un segundo planEntry con la misma activityId en el mismo plan y comprobar que la DB lo ACEPTA (evidencia concreta de que no existe constraint y de que el guard es el unico enforcement); restaurar el guard, repetir la operacion y comprobar que rechaza con el code de dominio y con el mensaje que termina exactamente en 'Unique constraint failed on the fields: (`activityId`)'. Limpiar la fila creada por el caso de control y dejar la evidencia registrada como sustento de la limitacion declarada en REQ-03.
Contrato: rollback: Revertir el commit de este archivo de test y borrar de la DB de test la fila duplicada creada por el caso de control. Sin cambios de esquema que revertir.. Status: done

#### S3.T1 — F2: portar el impacto de borrado a deletePlanEntriesBatch y al delete single, reusando buildRequirementTree/assembleRequirementTree y el evaluador puro evaluateRequirementTree.logic de forma recursiva y fiel al arbol Y/O (PROHIBIDO aplanar, RULE-curriculum-design-033); rechazo tipado que nombra el requirement o pool afectado; rechazo atomico del lote completo. La carga del arbol es una por plan afectado, no una por id del lote (forma acotada). La task padre se completa cuando terminan sus subtasks.
Contrato: rollback: Revertir el commit de F2: deletePlanEntriesBatch vuelve a borrar sin el guard de impacto; el preview client-side sigue existiendo.. Status: done

#### S3.T1.1 — Implementar la carga acotada del arbol de requisitos: una sola invocacion de buildRequirementTree/assembleRequirementTree por plan afectado, con el conjunto de ids del lote como entrada, dejando el arbol disponible en memoria para toda la evaluacion (sin N+1 por id).
Contrato: rollback: Revertir el commit de la carga; el modulo de impacto server-side queda sin fuente de datos y la fase no expone guard.. Status: done

#### S3.T1.2 — Implementar el evaluador de impacto server-side reusando evaluateRequirementTree.logic de forma recursiva sobre el arbol Y/O, sin aplanarlo a lista (RULE-curriculum-design-033): AND, OR de multiples vias y pool K-de-N; el grupo sin hojas normativas NO se toma como satisfecho y se reporta (RULE-curriculum-design-037).
Contrato: rollback: Revertir el commit del evaluador; el guard queda sin logica de decision y debe revertirse junto con su cableado.. Status: done

#### S3.T1.3 — Definir el error tipado del impacto con code de dominio y payload que nombra el requirement o el pool afectado, distinguiendo el caso AND simple del caso K-de-N (candidatos restantes vs K exigido) en el mensaje user-facing.
Contrato: rollback: Revertir el commit del error tipado; el guard vuelve a lanzar el error generico previo.. Status: done

#### S3.T1.4 — Cablear el guard en deletePlanEntriesBatch: evaluar el conjunto COMPLETO de ids del lote contra el arbol antes de ejecutar cualquier borrado y rechazar el lote entero si alguno deja un requisito insatisfacible (atomicidad, sin borrado parcial).
Contrato: rollback: Revertir el commit del cableado batch; deletePlanEntriesBatch vuelve a borrar sin evaluar impacto.. Status: done

#### S3.T1.5 — Cablear el guard en el delete single del override reusando exactamente la misma funcion de evaluacion (una sola implementacion para single y batch, sin duplicar logica).
Contrato: rollback: Revertir el commit del cableado single; el delete single vuelve al comportamiento previo.. Status: done

#### S3.T1.6 — Verificar que el guard de impacto vive en el override (no en un *Validated paralelo) y que corre tambien por deleteInstance generico con alias rt__ y por up1_delete_object; si alguna via lo esquiva, mover el cableado al punto que las tres vias atraviesan.
Contrato: rollback: No aplica (verificacion). Si hubo que mover el cableado, revertir ese commit deja el guard en su posicion previa.. Status: done

#### S3.T2 — F3: implementar la mutation dedicada movePlanEntry con renumerado transaccional de period/position, acotado a los periods origen y destino, normalizando explicitamente la convencion 0-based de CurriculumMesh (RULE-curriculum-design-041) y propagando errores dentro de la transaccion para forzar rollback completo (sin try/catch best-effort, RULE-curriculum-design-039). Depende de la unicidad de F1. La task padre se completa cuando terminan sus subtasks.
Contrato: rollback: Revertir el commit de F3: la mutation movePlanEntry desaparece del schema y el mover vuelve a resolverse por el update generico previo. Verificar que ningun cliente quede apuntando a la mutation eliminada antes de revertir.. Status: done

#### S3.T2.1 — Declarar la mutation movePlanEntry en el schema GraphQL (SDL) del mod y su resolver, con el contrato de entrada (entryId, period destino, position destino) y el error tipado para destino invalido (period fuera del rango de periodos del plan). El cambio es solo de SDL y resolver: no toca prisma/**/schema.prisma ni agrega migraciones.
Contrato: rollback: Revertir el commit: se quita la mutation del SDL y el resolver. Sin cambios de esquema de datos que revertir.. Status: done

#### S3.T2.2 — Implementar el renumerado transaccional: dentro de un unico $transaction, compactar el period origen y desplazar el period destino de modo que ambos queden como secuencia 0..n-1 sin huecos ni duplicados; propagar cualquier error para rollback completo (sin try/catch best-effort, RULE-curriculum-design-039). Es solo logica de resolver: el renumerado NO crea ni elimina indices ni constraints, no depende de un indice nuevo y no toca prisma/**/schema.prisma. Si el costo de query lo exigiera, se reporta como hallazgo para el analisis de modelo posterior.
Contrato: rollback: Revertir el commit del renumerado; si algun dato quedo inconsistente en ambiente de prueba, restaurar desde el snapshot previo a la ejecucion. Sin migracion que revertir.. Status: done

#### S3.T2.3 — Cablear el guard de plan-en-Draft (REQ-02) sobre movePlanEntry para que el move herede el mismo invariante de estado que create/update/delete.
Contrato: rollback: Revertir el commit; movePlanEntry deja de validar el estado del plan.. Status: done

#### S3.T3 — Tests de F2 y F3: unit del evaluador de impacto sobre arbol AND, OR de dos vias y pool K-de-N (incluido el grupo vacio de RULE-curriculum-design-037); integracion de deletePlanEntriesBatch con rechazo atomico de lote; test de conteo de queries con plan de ~60 entries y lote de 10 ids; unit y integracion de movePlanEntry verificando la secuencia 0..n-1 completa por period, el rollback ante fallo intermedio y el caso concurrente; bypass cross-client del delete; regresion contra el baseline de F0 del preview de impacto y del drag-and-drop.
Contrato: rollback: Revertir el commit de tests; la suite vuelve al conteo previo.. Status: done

#### S3.T3.1 — Unit del evaluador de impacto con arboles armados a mano: hoja unica de un AND (borrado bloquea), OR de dos vias con la otra satisfecha (borrado permitido), pool K-de-N que cae por debajo de K (bloquea y nombra el pool), y grupo sin hojas normativas (se reporta, no autoriza el borrado). Assertions sobre el requirement/pool nombrado, no solo sobre el booleano.
Contrato: rollback: Revertir el commit de este archivo de test.. Status: done

#### S3.T3.2 — Integracion del delete single contra DB de test: borrar un planEntry no referenciado persiste y baja el count en 1; borrar el unico satisfactor de una hoja AND rechaza con error tipado que nombra el requirement y la fila sigue existiendo; borrar una de dos vias de un OR satisfecho pasa.
Contrato: rollback: Revertir el commit de este archivo de test.. Status: done

#### S3.T3.3 — Integracion del batch: lote de 5 ids donde 1 dejaria un requisito insatisfacible rechaza el lote completo y los 5 planEntry siguen existiendo (count antes/despues, sin borrado parcial); lote de 5 ids todos inocuos borra los 5.
Contrato: rollback: Revertir el commit de este archivo de test.. Status: done

#### S3.T3.4 — Test de forma acotada: con un plan sembrado de ~60 planEntry y arbol de requisitos anidado a 3 niveles, medir el conteo de queries (o el tiempo) de un batch de 10 ids y asertar que la carga del arbol ocurre una vez por plan y no una por id; documentar la medicion.
Contrato: rollback: Revertir el commit del test y descartar el seed del plan de ~60 entries de la DB de test.. Status: done

#### S3.T3.5 — Unit e integracion del renumerado de movePlanEntry: mover de (period 2, position 1) a (period 3, position 0) y mover dentro del mismo period de position 3 a 0; asertar la lista ordenada completa de cada period afectado como secuencia exacta 0..n-1 sin huecos ni duplicados (convencion 0-based, RULE-curriculum-design-041), no solo la posicion del entry movido.
Contrato: rollback: Revertir el commit de este archivo de test.. Status: done

#### S3.T3.6 — Tests de rechazo y rollback de movePlanEntry: forzar un error en el paso intermedio del renumerado y asertar que la malla queda identica al estado previo (period y position de todos los entries); destino con period fuera del rango del plan rechaza con error tipado sin mutar nada; plan no-Draft rechaza heredando el guard de REQ-02.
Contrato: rollback: Revertir el commit de este archivo de test; retirar el hook de inyeccion de fallo si quedo en el codigo de produccion.. Status: done

#### S3.T3.7 — Test de concurrencia: dos movePlanEntry simultaneos sobre el mismo period; asertar que no quedan positions duplicadas y que el resultado es o un fallo limpio de uno de los dos o la serializacion de ambos, nunca estado corrupto.
Contrato: rollback: Revertir el commit de este archivo de test.. Status: done

#### S3.T3.8 — Bypass cross-client del delete (deleteInstance generico con alias rt__ y up1_delete_object sobre el planEntry bloqueante, mismo code que el path del mod) y regresion contra el baseline de F0: el preview de impacto en la UI y el resultado del drag-and-drop coinciden con lo capturado en F0; correr la suite del mod y el E2E del MCP y reportar el estado de la fase.
Contrato: rollback: Revertir el commit de los tests de bypass; descartar el reporte de regresion.. Status: done

#### S4.T1 — F4: sanitizacion HTML server-side de CustomSection con whitelist en el create y el update del resolver, antes de persistir; conservar el render sanitizado client-side (RichTextRenderer/sanitizeHtml.ts) como defensa en profundidad. La whitelist se declara como constante, sin magic strings dispersos.
Contrato: rollback: Revertir el commit de F4: el write deja de sanitizar y la defensa vuelve a ser solo el render client-side. No hay migracion de datos que revertir (no se reescribe historico).. Status: done

#### S4.T2 — F5 R0 (A-CD-7): extender al path rt__Plan__curriculum el guard que impide cambiar progression con malla no vacia, re-cableando los guards de dominio de la rama !RT_PATTERN para que corran tambien en la rama rt (RULE-curriculum-design-032) y sin disparar upsert de la proyeccion rt en un update base-only (RULE-curriculum-design-036). El chequeo de 'malla no vacia' usa existence check acotado, no carga completa.
Contrato: rollback: Revertir el commit: RT_PATTERN y el cableado de guards vuelven al estado previo; el guard sigue activo en el path base y el bypass por path rt reaparece (estado conocido, documentado como brecha).. Status: done

#### S4.T3 — F5 R1 (A-CD-8): agregar withObjectAuth a createSyllabusOffering en syllabus-offering.resolver.js, siguiendo el patron de los demas resolvers del mod, conservando el chequeo de sesion existente.
Contrato: rollback: Revertir el commit: createSyllabusOffering vuelve a validar solo sesion. Verificar antes que ningun flujo legitimo dependa del rechazo nuevo.. Status: done

#### S4.T4 — F6: cierre y coordinacion. Documentar el veredicto de blockGenericMutation por objeto (planEntry y CustomSection en N0 => innecesario para cd; cualquier objeto que no alcance N0 se nombra y se marca para coordinar con UPONE-1758), registrar los Core Extensions detectados para core (requiresComment, enum RecordType) sin implementarlos, y dejar por escrito las advertencias de alcance: notificacion al PO sobre UPONE-1757, cualquier caso reclasificado de C a A por el gate de F0, y el enlace al documento de hallazgos de modelo diferido (unique/indices de A-CD-2 y A-CD-5) con su riesgo residual. El conteo de duplicados de UPU, si se relevo, se reporta como dato del hallazgo, no como decision tomada en este ticket.
Contrato: rollback: Descartar el documento de cierre. Sin cambios de codigo.. Status: done

#### S4.T5 — Tests de F4, F5 y regresion completa: unit del sanitizador con payloads script/onerror/javascript:href y HTML legitimo verificando el valor PERSISTIDO en DB (no solo la respuesta); integracion del guard de progression por path rt y por path base mas la regresion de los demas guards de la rama !RT_PATTERN; integracion de RBAC de createSyllabusOffering con y sin capability; matriz cross-client completa de las 18 celdas; regresion final de la suite del mod, del E2E del MCP (read-back + 4 fronteras) y comparacion contra el baseline de F0; verificacion de que el diff no toca el repo mcp ni object-manager y de que no aparece superficie MCP nueva.
Contrato: rollback: Revertir el commit de tests; la suite vuelve al conteo previo.. Status: done

#### S4.T6 — Registrar el HALLAZGO de endurecimiento de modelo DIFERIDO para el analisis posterior: (a) @@unique([planId, activityId]) y su indice de soporte para A-CD-2, con el riesgo residual de sostenerlo solo con logica (write directo a la DB o path futuro que saltee el override queda sin cubrir; sin indice de cobertura la deteccion puede degradar a scan por plan en lotes grandes); (b) indice ([planId, period, position]) de apoyo al renumerado de A-CD-5 y el riesgo bajo concurrencia sin constraint de unicidad; (c) semantica de NULL del unique y conteo de duplicados preexistentes de UPU si se relevo, como DATO INFORMATIVO del hallazgo y no como insumo de decision de este ticket. Ningun cambio de esquema se implementa aqui.
Contrato: rollback: Descartar el documento de hallazgos. Sin cambios de codigo ni de esquema.. Status: done

#### S4.T7 — Verificacion de alcance solo-logica sobre el diff completo del ticket: git diff --name-only contra la base de la rama no arroja ninguna coincidencia con prisma/**/schema.prisma ni con directorios de migraciones (assertion sobre lista vacia), el historial de migraciones aplicadas en la DB de test es identico antes y despues de todas las fases, y el diff no contiene componentes de UI, estilos, tokens de diseno ni stories de Storybook. Reportar la lista concreta de archivos tocados.
Contrato: rollback: No aplica (solo verificacion). Descartar el reporte.. Status: done
## Verificacion runtime

1. **Qué:** Verificar en runtime: Baseline y gate de clasificacion (F0): antes de tocar codigo se refresca el watermark de curriculum-design (git fetch, revisar commits posteriores a 8a151e7) y de mcp (30a032a), se materializa el submodulo mods/curriculum-design, se levantan los ambientes (:4000 object-manager/
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
2. **Qué:** Verificar en runtime: A-CD-6 (F4, seguridad): sanitizacion HTML server-side del contenido de CustomSection. El create y el update del resolver sanitizan el HTML con una whitelist ANTES de persistir, de modo que el payload malicioso no llega a la DB por ninguna via (UI, generico, MCP). El render sani
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-03 (edit) `confirmed`: A-CD-2 (F1): unicidad (planId, activityId) en planEntry implementada SOLO como guard aplicativo (Via B) en el override de createInstance/upd
- REQ-06 (edit) `confirmed`: A-CD-5 (F3): mutation dedicada movePlanEntry con renumerado transaccional, implementada SOLO como logica en el resolver del mod. Mover un pl
- REQ-12 (add) `confirmed`: Alcance solo-logica (transversal, F0-F6): ninguna tarea de ninguna fase edita archivos de esquema Prisma (prisma/**/schema.prisma) ni crea, 
- REQ-13 (add) `confirmed`: Sin superficie visual (transversal): este ticket es backend puro (resolvers/overrides del mod y sus tests). No introduce ni modifica UI, maq

**Tasks agregadas:**

- S2: Test de control de la Via B para A-CD-2: con el guard de unicidad desactivado, insertar por integracion un segundo planEntry con la misma activityId en el mismo plan y comprobar que la DB lo ACEPTA (evidencia concreta de que no existe constraint y de que el guard es el unico enforcement); restaurar el guard, repetir la operacion y comprobar que rechaza con el code de dominio y con el mensaje que termina exactamente en 'Unique constraint failed on the fields: (`activityId`)'. Limpiar la fila creada por el caso de control y dejar la evidencia registrada como sustento de la limitacion declarada en REQ-03. (valida: REQ-03, REQ-12, test; rollback: Revertir el commit de este archivo de test y borrar de la DB de test la fila duplicada creada por el caso de control. Sin cambios de esquema que revertir.)
- S4: Registrar el HALLAZGO de endurecimiento de modelo DIFERIDO para el analisis posterior: (a) @@unique([planId, activityId]) y su indice de soporte para A-CD-2, con el riesgo residual de sostenerlo solo con logica (write directo a la DB o path futuro que saltee el override queda sin cubrir; sin indice de cobertura la deteccion puede degradar a scan por plan en lotes grandes); (b) indice ([planId, period, position]) de apoyo al renumerado de A-CD-5 y el riesgo bajo concurrencia sin constraint de unicidad; (c) semantica de NULL del unique y conteo de duplicados preexistentes de UPU si se relevo, como DATO INFORMATIVO del hallazgo y no como insumo de decision de este ticket. Ningun cambio de esquema se implementa aqui. (valida: REQ-03, REQ-06, REQ-12; rollback: Descartar el documento de hallazgos. Sin cambios de codigo ni de esquema.)
- S4: Verificacion de alcance solo-logica sobre el diff completo del ticket: git diff --name-only contra la base de la rama no arroja ninguna coincidencia con prisma/**/schema.prisma ni con directorios de migraciones (assertion sobre lista vacia), el historial de migraciones aplicadas en la DB de test es identico antes y despues de todas las fases, y el diff no contiene componentes de UI, estilos, tokens de diseno ni stories de Storybook. Reportar la lista concreta de archivos tocados. (valida: REQ-12, REQ-13, test; rollback: No aplica (solo verificacion). Descartar el reporte.)

**Task ops:**

- edit S2.T1.2 { desc="Guard A-CD-2 (unicidad planId+activityId) implementado SOLO como guard aplicativo en el override de create/update de planEntry (single y batch), SIN tocar el esquema: detectar el duplicado contra las entradas ya persistidas del plan y tambien dentro del propio lote, rechazar con el code de dominio del mod y formatear el mensaje terminando exactamente en 'Unique constraint failed on the fields: (`activityId`)' (RULE-curriculum-design-005). NO aplicar @@unique([planId, activityId]) ni el indice de soporte ni migracion alguna: el endurecimiento de modelo queda diferido al analisis posterior. Dejar en el codigo y en el PR la nota de limitacion: sin constraint el invariante depende de que todo write pase por el override, y sin indice de cobertura la deteccion puede degradar a scan por plan en lotes grandes.", rollback="Revertir el commit del guard: el override queda como estaba y la unicidad vuelve a depender del pre-check client-side. No hay migracion ni cambio de esquema que revertir.", validates=["REQ-03","REQ-12"] }
- edit S3.T2.1 { desc="Declarar la mutation movePlanEntry en el schema GraphQL (SDL) del mod y su resolver, con el contrato de entrada (entryId, period destino, position destino) y el error tipado para destino invalido (period fuera del rango de periodos del plan). El cambio es solo de SDL y resolver: no toca prisma/**/schema.prisma ni agrega migraciones.", rollback="Revertir el commit: se quita la mutation del SDL y el resolver. Sin cambios de esquema de datos que revertir.", validates=["REQ-06","REQ-12"] }
- edit S3.T2.2 { desc="Implementar el renumerado transaccional: dentro de un unico $transaction, compactar el period origen y desplazar el period destino de modo que ambos queden como secuencia 0..n-1 sin huecos ni duplicados; propagar cualquier error para rollback completo (sin try/catch best-effort, RULE-curriculum-design-039). Es solo logica de resolver: el renumerado NO crea ni elimina indices ni constraints, no depende de un indice nuevo y no toca prisma/**/schema.prisma. Si el costo de query lo exigiera, se reporta como hallazgo para el analisis de modelo posterior.", rollback="Revertir el commit del renumerado; si algun dato quedo inconsistente en ambiente de prueba, restaurar desde el snapshot previo a la ejecucion. Sin migracion que revertir.", validates=["REQ-06","REQ-12"] }
- edit S4.T4 { desc="F6: cierre y coordinacion. Documentar el veredicto de blockGenericMutation por objeto (planEntry y CustomSection en N0 => innecesario para cd; cualquier objeto que no alcance N0 se nombra y se marca para coordinar con UPONE-1758), registrar los Core Extensions detectados para core (requiresComment, enum RecordType) sin implementarlos, y dejar por escrito las advertencias de alcance: notificacion al PO sobre UPONE-1757, cualquier caso reclasificado de C a A por el gate de F0, y el enlace al documento de hallazgos de modelo diferido (unique/indices de A-CD-2 y A-CD-5) con su riesgo residual. El conteo de duplicados de UPU, si se relevo, se reporta como dato del hallazgo, no como decision tomada en este ticket.", rollback="Descartar el documento de cierre. Sin cambios de codigo.", validates=["REQ-10","REQ-12"] }

## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4

### Session 2 · T3 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T1.1
- [x] S2.T1.2
- [x] S2.T1.3
- [x] S2.T1.4
- [x] S2.T2
- [x] S2.T2.1
- [x] S2.T2.2
- [x] S2.T2.3
- [x] S2.T2.4
- [x] S2.T2.5
- [x] S2.T2.6
- [x] S2.T2.7
- [x] S2.T2.8
- [x] S2.T3

### Session 3 · T3 · continue

**Tasks:**
- [x] S3.T1
- [x] S3.T1.1
- [x] S3.T1.2
- [x] S3.T1.3
- [x] S3.T1.4
- [x] S3.T1.5
- [x] S3.T1.6
- [x] S3.T2
- [x] S3.T2.1
- [x] S3.T2.2
- [x] S3.T2.3
- [x] S3.T3
- [x] S3.T3.1
- [x] S3.T3.2
- [x] S3.T3.3
- [x] S3.T3.4
- [x] S3.T3.5
- [x] S3.T3.6
- [x] S3.T3.7
- [x] S3.T3.8

### Session 4 · T2 · continue

**Tasks:**
- [x] S4.T1
- [x] S4.T2
- [x] S4.T3
- [x] S4.T4
- [x] S4.T5
- [x] S4.T6
- [x] S4.T7

### Session 5 · T0 · open
