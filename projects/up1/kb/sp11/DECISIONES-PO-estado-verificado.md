---
id: DOC-kb-sp11-DECISIONES-PO-estado-verificado
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp11
  - mcp
  - curriculum-mapping
  - curriculum-design
  - decisiones
  - PO
  - estado-verificado
  - cm-plan
  - cd-plan
---

# Decisiones para el PO (cm + cd al MCP) — con estado verificado en código

Consolidado de todas las decisiones pendientes que condicionan los planes de cm y cd al MCP (opción mod), cada una con su **estado actual verificado en código el 2026-09-14**, su recomendación y a qué ticket pertenece. Complementa a [Plan cm](PLAN-cm-mcp-ready-opcion-mod), [Plan cd](PLAN-cd-mcp-ready-opcion-mod) y al [Gate de validación de fixes de core](GATE-validacion-estado-fix-core). Espejo de la sección "Decisiones para el PO" del artifact del PO.

Distinción clave: cada decisión tiene un **hecho verificable** (lo que existe o no hoy en el código) separado de la **elección** que debe tomar el PO/equipo. El hecho se comprobó contra los repos (`up1/mods/curriculum-design`, `up1/mods/curriculum-mapping`, `up1/mcp`, `up1/object-manager`).

## D1 · ¿Cerramos ya el riesgo de prerrequisitos en Design? (prioridad · riesgo vigente)
- **Qué se decide:** si CD-01 entra de inmediato como prioridad.
- **Estado verificado (2026-09-14):** hueco ABIERTO. El evaluador de requisitos existe en el servidor (logic/helpers/evaluateRequirementTree.js) pero solo se invoca en el borrado (logic/helpers/planEntryDeletionRequirementGuard.js); NO se referencia en el alta (planEntry-batch.resolver.js / sectionValidation.resolver.js). Riesgo activo real, alcanzable hoy por `cd_add_plan_entries_batch`.
- **Recomendación:** hacerlo primero, ya (2-3 SP; la pieza server ya existe a medias). **Se mantiene, reforzada por el hecho.**
- **Decide:** PO. **Ticket:** CD-01.

## D2 · ¿Qué alcance le damos a la lectura de Design? (alcance)
- **Qué se decide:** qué tanto se construye de la lectura de la malla y del árbol de requisitos, y con qué profundidad.
- **Estado verificado (2026-09-14):** la agregación NO existe. En cd solo hay queries sueltas (validateActivityEvaluations, create/updateCurriculumWithRecordType); ninguna devuelve la malla ni el árbol agregados. Hay que construirla desde cero.
- **Recomendación:** definir un alcance mínimo útil (malla + árbol) este sprint; refinamientos después. Mueve 3-6 SP. **Se mantiene.**
- **Decide:** PO + equipo cd. **Ticket:** CD-05.

## D3 · Design: ¿el borrado de ciertos objetos está desprotegido a propósito o falta un resguardo? (técnica, PO informado)
- **Qué se decide:** si el borrado de Activity/Curriculum/CurricularSection/Offering sin validación propia es intencional (la DB lo frena) o un hueco.
- **Estado verificado (2026-09-14):** confirmado que NO hay override/guard de borrado propio para esos 4 objetos (solo planEntry tiene borrado propio, planEntry-delete-batch.resolver.js). Queda decidir intencional vs hueco.
- **Recomendación:** revisar los 4 casos con el equipo antes de declarar la postura (CD-07). **Se mantiene.**
- **Decide:** equipo de cd. **Ticket:** CD-07.

## D4 · Design: ¿cómo se controla mover una materia? (técnica)
- **Qué se decide:** si además se refuerza la vía común de edición, o alcanza con exponer la operación dedicada.
- **Estado verificado (2026-09-14):** la operación dedicada YA existe (logic/planEntry-move.resolver.js + planEntryMoveRenumber.js + planEntryMoveDestinationGuard.js). Solo falta exponerla; no está expuesta al asistente.
- **Recomendación:** exponer la operación dedicada (atómica) cubre el caso sin refuerzos extra. **Se mantiene, reforzada:** el trabajo ya está construido.
- **Decide:** equipo de cd. **Tickets:** CD-07, CD-08.

## D5 · Mapping: ¿retiro real de matriz y completitud de rúbrica? (negocio · calidad de datos)
- **Qué se decide:** (a) retiro de matriz por estado vs borrado real; (b) implementar la completitud de rúbrica o diferirla.
- **Estado verificado (2026-09-14):** el retiro por estado (ciclo de estado de la matriz) existe; un borrado real de matriz NO está implementado. La completitud (RP5) no la aplica hoy ni la pantalla ni el asistente.
- **Recomendación:** para estar listo alcanza con el retiro por estado y diferir la completitud; implementar solo si el negocio lo pide (2-4 SP). **Se mantiene.**
- **Decide:** PO. **Ticket:** CM-10.

## D6 · ¿Perseguimos el cambio estructural de núcleo (follow-up)? (estratégica)
- **Qué se decide:** si se persigue el arreglo en el núcleo que cerraría todas las vías, y tomar el rumbo ANTES de construir CM-07.
- **Estado verificado (2026-09-14):** NO implementado. object-manager mantiene el dueño único de la escritura genérica (sin lista de interceptores; grep en src/graphql/resolverIndex.js + instance.resolver.js sin resultados).
- **Recomendación:** no hacerlo ahora; dejarlo como seguimiento, decidir el rumbo antes de CM-07. **Vigente MIENTRAS el núcleo siga sin implementarse; re-verificar al ejecutar** (Check B del gate). Si el cambio ya está, CM-07 se saltea y CM-09/CD-07 se reajustan.
- **Decide:** PO + equipo de núcleo. **Afecta:** CM-07, CM-09, CD-07.

## D7 · ¿Aprobamos e integramos el "fix en espera de merge"? (coordinación)
- **Qué se decide:** aprobar e integrar el motor del bloqueo junto con la declaración de cm y el ajuste de academic-scheduling, en el mismo despliegue.
- **Estado verificado (2026-09-14):** NO integrado. `src/contracts/generic-write-block.js` no está en develop de up1/mcp; existe solo en la rama origin/UPONE-1758.
- **Recomendación:** coordinar el despliegue conjunto en cuanto el motor pase su verificación. **Vigente MIENTRAS el fix siga sin integrarse; re-verificar al ejecutar** (Check A del gate). Si ya está integrado, CM-09 se activa en vez de esperar.
- **Decide:** PO + núcleo + academic-scheduling. **Afecta:** CM-09, CD-07.

## D8 · Design: ¿la guía cubre los 12 objetos o solo los más usados? (alcance)
- **Qué se decide:** cuántos objetos reciben su guía de campos ahora.
- **Estado verificado (2026-09-14):** hoy tienen guía 3 objetos en Mapping (ai/contracts.js) y 1 en Design (ai/contracts.js); el resto falta.
- **Recomendación:** priorizar materias, entradas del plan, requisitos y currículo; catálogos/relaciones después. **Se mantiene.**
- **Decide:** PO + equipo. **Ticket:** CD-06 (y CM-08 para Mapping).

## Nota de vigencia
Las recomendaciones D1-D5 y D8 dependen de estado del código PROPIO de los mods, estable salvo que alguien lo trabaje. **D6 y D7 dependen del avance de otros equipos** (núcleo, mcp, academic-scheduling): su recomendación es vigente mientras el estado verificado siga igual, y se re-verifica con el gate (Check A/B) al momento de ejecutar CM-07/CM-09/CD-07. Ninguna recomendación cambió tras la verificación; D1 y D4 quedaron mejor sustentadas.
