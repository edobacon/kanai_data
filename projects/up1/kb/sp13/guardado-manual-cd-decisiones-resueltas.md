---
id: DOC-kb-sp13-guardado-manual-cd-decisiones-resueltas
project: up1
type: doc
module: curriculum-design
tags:
  - sp13
  - curriculum-design
  - guardado-manual
  - borrador
  - decisiones
  - tributacion
  - precedentes
---

# Guardado manual en cd: decisiones resueltas sobre los precedentes del código

Resolución de las decisiones D1 a D9 del plan de guardado manual en cd, tomando como criterio lo que ya existe en el código, con tributación (cm) como referencia principal. Verificado contra código real el 2026-10-13, rama develop. Plan global en [[guardado-manual-cd-plan-de-accion]].

## En una frase

Cada decisión sigue el precedente más cercano que ya funciona en el código: guardar el conjunto en una mutation transaccional con `knownIds` (tributación), enviar los árboles planos con ids temporales y recibir el mapeo de ids (árbol de competencias de cm), y mantener barra propia hasta que el core ofrezca un contrato. Hay solo dos desviaciones deliberadas, ambas pequeñas: confirmar Descartar y avisar al cerrar la pestaña.

**Nota sobre quién decide:** D3, D4, D5, D6 y D8 tocan comportamiento visible para el usuario final. Las resolví con el precedente del código para destrabar el diseño, pero quedan como propuesta que el PO puede revertir. Cada una indica qué cambiaría si se revierte.

## Precedentes del código usados como criterio

| Id | Precedente | Dónde | Qué aporta |
|---|---|---|---|
| P1 | Guardado de conjunto de tributación | `curriculum-mapping/logic/competencyAlignment-batch.resolver.js` (`upsertCompetencyAlignmentSetValidated`, L380-568) | Conjunto completo en una mutation, `knownIds` para los retiros, tope de filas y RBAC por operación efectiva validados antes de abrir la transacción, escritura en transacción, evento posterior, historial de una sola entrada, `PLAN_LOCKED` |
| P2 | Guardado del árbol de competencias | `curriculum-mapping/logic/competencyTree-upsert.resolver.js` y su esquema | Payload plano con `parentId`, nodos nuevos con `_tempId` que pueden colgar de otros nodos nuevos, el servidor ordena por niveles (`planTree`) y escribe de arriba abajo, devuelve `nodes` (mapeo de id temporal a id real), devuelve `warnings` que no bloquean (suma de pesos distinta de 100; se bloquea al publicar), rechaza todo el guardado si un id ya no existe, exige el árbol entero, todo en una transacción |
| P3 | Borrado inmediato separado | `deleteCompetencyNodesValidated` (mismo esquema) | cm eligió borrar al confirmar y no al guardar, porque es irreversible |
| P4 | Elementos que viajan en el Guardar del formulario | `PerformanceScaleEditor` y `CompetencyTreeEditor` (`submits: true`) con `customEndpoint` en `default_PerformanceScale_edit.json`, `default_CompetencyNode_edit.json` y otros; ejecución en `RecordDetail.vue` L5272 | El core ya permite que el valor de un elemento (con `_tempId` y `_dirty`) viaje a una mutation gobernada en el Guardar estándar. La mutation reemplaza al guardado estándar del formulario |
| P5 | Guards reutilizables de la malla | `curriculum-design/logic/helpers/`: `planEntryPlanStatusGuard`, `planEntryUniquenessGuard`, `planEntryShapeGuard`, `planEntryDeletionRequirementGuard`, `planEntryMoveDestinationGuard`, `planEntryMoveRenumber`, `planEntryPlacements` | Las reglas de la malla ya están como helpers; el nuevo guardado no las reescribe |
| P6 | Peso en cd | `curriculum-design/logic/helpers/weightedSum.js` (existe; se confirma lo que en el plan figuraba como pendiente) | Aritmética de paridad entre cliente y servidor |
| P7 | Lectura de tributación | `curriculum-mapping/logic/alignmentView.resolver.js` L5-96 | La grilla de tributación lee los `planEntry` desde el servidor, no desde el estado de la malla |

## Decisiones resueltas

### D1. Estrategia de guardado del servidor: batch transaccional (opción B) en los tres componentes

- **Decisión:** una mutation de servidor por componente, atómica, con las dos formas de payload que ya existen:
  - **Conjunto con `knownIds`** (P1) para la malla (`savePlanMeshSet`).
  - **Árbol plano con `_tempId` y mapeo de ids en la respuesta** (P2) para el árbol de secciones (`saveCompositeSectionSet`) y el editor de requisitos (`saveRequirementSet`).
- **Por qué:** ambos patrones ya están en producción, resuelven ids temporales, orden de padres e hijos, retiros y atomicidad, y sus pruebas existen. El replay de mutations actuales (opción A) no es atómico y reintroduce los rollbacks manuales.
- **Cambio al plan anterior:** la malla ya no usa `movePlanEntry` como entrega puente. Varios arrastres acumulados en un borrador serían N llamadas no atómicas. Se reusan sus helpers (`planEntryMoveRenumber`, `planEntryMoveDestinationGuard`) dentro de `savePlanMeshSet`. Por eso el borrador de la malla (M1 y M2) depende del backend (M3).
- **Qué cambia si se revierte:** volver a A permite entregar sin backend pero deja guardados parciales.

### D2. Relación con el kit del core: barra propia con composable genérico, sin esperar a UPONE-1931

- **Decisión:** cada componente trae su barra Guardar/Descartar como tributación, sobre un composable genérico extraído de `competencyAlignmentDraft.logic.ts`, con un adaptador para conectarse al core cuando exista el contrato.
- **Por qué:** el core no tiene hoy un contrato para registrar guardar, descartar y dirty de un elemento (verificado en `RecordDetail.vue`). El mecanismo que sí existe (P4, `customEndpoint`) reemplaza el guardado estándar del formulario con una sola mutation, y los layouts de cd donde viven los componentes no sirven para eso: `default_Activity_edit.json` mezcla campos estándar de la Activity con el árbol y el editor, y `default_Curriculum_edit.json` junta la malla y la tributación, cada una con su guardado.
- **Camino de evolución:** en un layout dedicado a un solo objeto, un componente puede pasar a `submits: true` más `customEndpoint` y quedar bajo el Guardar único. P4 muestra cómo.
- **Qué cambia si se revierte:** esperar al kit retrasa todo el trabajo sin que el núcleo del borrador cambie.

### D3. Acciones fuera del borrador: se aceptan las excepciones; el borrado sí entra al borrador

- **Decisión:** quedan como acción inmediata la transición de estado de la Activity, la subida de archivos y el "crear nuevo" de un selector de referencia (los dos últimos son del core). Todo borrado de los tres componentes entra al borrador y se aplica al Guardar.
- **Por qué:** las excepciones no se pueden descartar de forma natural y su cambio es trabajo del core. El borrado en el borrador se aparta de P3 (cm borra al confirmar) porque aquí el objetivo es un Descartar real; el servidor rearma la cascada y la valida sobre el estado final.
- **Qué cambia si se revierte:** si el PO quiere borrado inmediato como en cm, el borrado queda fuera del borrador y su confirmación seguiría siendo un modal.

### D4. Pesos: bloqueo `<=` en el servidor sobre el estado final, igualdad solo al publicar, cliente informativo

- **Decisión:** el servidor valida `suma(hijos) <= padre` sobre el estado final del conjunto (no write por write). La igualdad exacta a 100 solo se exige al publicar la Activity, como hoy. El cliente sigue marcando con un tooltip sin bloquear. Una suma que no cierra se devuelve como `warnings` de la respuesta de guardado, sin bloquear (P2).
- **Por qué:** es lo que ya hacen P2 (suma distinta de 100 no bloquea al guardar) y el servidor de cd (`EVALUATION_WEIGHT_EXCEEDS_PARENT` al escribir, `EVALUATION_WEIGHT_MISMATCH` al publicar). Validar el estado final elimina el problema del orden (60/40 a 50/50). La aritmética se reusa de `weightedSum.js` (P6).
- **Qué cambia si se revierte:** si el PO exige bloquear en cliente, se activa la validación existente como bloqueante, pero se pierde la ventaja de guardar un árbol a medio armar.

### D5. Concurrencia: regla de id obsoleto de P2 más `knownIds` de P1; edición simultánea de la misma fila, gana la última

- **Decisión:** si el payload trae un id que ya no existe en la base, el servidor rechaza todo el guardado con un código tipado y el cliente ofrece recargar, tal como lo hace el guardado del árbol de competencias. Los retiros se limitan a `knownIds` (P1). Dos personas que editan la misma fila: gana la última escritura, como en tributación. En la malla, las posiciones se renumeran en el servidor según el orden del borrador.
- **Por qué:** es la semántica de los precedentes. Descarto la firma del snapshot que propuse antes: no existe en ningún precedente y agrega costo sin evidencia de que haga falta.
- **Qué cambia si se revierte:** si más adelante hay conflictos reales, se agrega versión de fila como un cambio de esquema aparte.

### D6. Descartar: con confirmación solo si hay cambios (desviación deliberada)

- **Decisión:** Descartar pide confirmación cuando el borrador está sucio y no la pide cuando está limpio. Sin deshacer por operación.
- **Por qué:** tributación descarta sin confirmar, pero el componente ya usa `ConfirmationModal` para cambiar de matriz y para retirar, y un borrador de malla o de árbol es mucho más largo que un conjunto de tributaciones. La confirmación cuesta una reutilización de un modal existente.
- **Qué cambia si se revierte:** igualar a tributación (sin confirmación) elimina el modal y mantiene el aviso por toast.

### D7. Aviso de salida: `beforeunload` en el composable genérico (desviación deliberada) y confirmación al cambiar de contexto interno

- **Decisión:** el composable genérico registra `beforeunload` mientras el borrador está sucio y cada componente confirma al cambiar de contexto interno (como el cambio de matriz de tributación). Los avisos de modal y de ruta quedan a cargo del core, que consulta el `isDirty` del formulario y no el del borrador.
- **Por qué:** ni tributación ni el core implementan `beforeunload` (búsqueda en el mod y en `RecordDetail`/suite). Es una limitación declarada del propio componente de tributación. Un listener es barato y evita perder un borrador largo por una recarga.
- **Qué cambia si se revierte:** sin `beforeunload` se replica la limitación actual de tributación.

### D8. Caso 28 de UPONE-1931: tributación ve solo lo persistido

- **Decisión:** la grilla de tributación sigue leyendo los `planEntry` persistidos. Un borrador sin guardar en la malla no aparece en tributación.
- **Por qué:** P7 confirma que tributación los lee del servidor, no del estado de la malla. Es el comportamiento actual y no requiere acoplar los dos borradores.
- **Hallazgo preexistente (no corregido, a verificar):** el guard de borrado de la malla (`planEntry-delete-batch.resolver.js` y `planEntryDeletionRequirementGuard.js`) no menciona tributaciones. Una asignatura con tributación puede borrarse sin que el guard de cd lo considere. Falta verificar si lo cubre una restricción de base de datos o el borrado en cascada. Se reporta, no se corrige en este trabajo.
- **Qué cambia si se revierte:** mostrar el borrador de la malla en tributación acoplaría ambos componentes y es el caso 28 sin resolver.

### D9. Orden de entrega: por riesgo, con los backends al inicio

- **Decisión:** el orden de entrega queda así:
  1. G0 (decisiones y spikes) y G1 (composable genérico y barra).
  2. R1 (exigencia del editor de requisitos), como primera entrega visible: es un solo `UPDATE_INSTANCE`, valida barra y bloqueo temprano.
  3. Backends en paralelo: R2 (`saveRequirementSet`), T1 (`saveCompositeSectionSet`), M3 (`savePlanMeshSet`).
  4. Fronts: R3, T2, T3 y el borrador de la malla (M1 y M2 fusionados).
  5. M4 (electiva y modular) y V1 (avisos, coordinación, documentación).
- **Por qué:** los backends dependen de patrones ya escritos (P1, P2, P5) y son independientes entre sí. Adelantar R1 valida el núcleo sin tocar el servidor.

## Efecto sobre el esfuerzo

Los precedentes reducen el esfuerzo de tres piezas: el composable genérico se extrae de código existente, el árbol de secciones copia la forma del guardado de competencias, y la malla reusa los helpers de guards. Total orientativo revisado: **108 a 179 puntos** (antes 129 a 208), sin contar el kit del core. Son rangos para calibrar, no compromisos. El detalle por ticket está en [[guardado-manual-cd-plan-de-accion]].

## Pendientes de verificación

- Qué cubre el borrado de un `planEntry` con tributaciones (restricción de base de datos o cascada).
- Cómo se comporta `submit: false` frente al Guardar de la Activity cuando el componente tenga su propia barra.
- Si la edición abre en modal o en página completa.

## Vigencia

Depende de los resolvers citados de cm y cd y de `RecordDetail.vue`. Re-verificar si cambia la forma de `customEndpoint` o llega el contrato de UPONE-1931.

## Documentos relacionados

- [[guardado-manual-cd-plan-de-accion]]
- [[guardado-manual-cd-contexto-core-y-referencia-tributacion]]
- [[guardado-manual-cd-curriculum-mesh]]
- [[guardado-manual-cd-composite-section-tree]]
- [[guardado-manual-cd-requirement-editor]]
- [[guardado-manual-cd-componentes-menores]]
