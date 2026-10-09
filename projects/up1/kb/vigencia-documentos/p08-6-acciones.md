---
id: DOC-kb-vigencia-documentos-p08-6-acciones
project: up1
type: doc
module: curriculum-design
tags:
  - vigencia
  - workflow
  - estados
  - versionamiento
  - sp12
---

# Vigencia 08: 6 Catálogo de acciones

> Grupo: Parte funcional · Parte 8 de 17 · Líneas 761 a 897 del original · [Índice](00-indice.md)

**Ver en HTML (mismo estilo del original):** [p08-6-acciones.html](p08-6-acciones.html)

## Qué dice esta parte

Tabla de qué se permite en cada estado de vigencia (editar, reordenar, poner en vigencia, retirar, cerrar, clonar, eliminar, usar desde otro documento) y clasificación de las acciones específicas de curriculum-design y curriculum-mapping como reforma, ajuste, uso o permitido. 'Según clase' significa que la respuesta depende del `changeClass` del campo. Se apoya en 71 permisos de `capabilities.json` y 34 tools del MCP. Faltan academic-scheduling, uengagement y la medición de logro.

## Dónde se habló en la reunión (6 oct 2026)

01:04:30 a 01:13:20. Transcripción: `TRANSCRIPT-2026-10-06-modelamiento-flujo-estatus-reglas-uassessment` (records).

## Verificado contra el código (8 oct 2026)

- No se verificó el conteo de 71 permisos ni de 34 tools en esta pasada.
- Las acciones listadas existen como tools/resolvers (por ejemplo `cd_add_plan_entries_batch`, `cm_close_matrix_adoptions`); la clasificación es propuesta, no comportamiento actual.

## Decisiones y preguntas ligadas

Revisar acción por acción con los dueños de cada mod (sección 14, parte 16, puntos 'Validar').

## Fragmento del documento (texto del artefacto)

```text
6 · Catálogo de acciones
Qué acciones gobierna la regla
Dos niveles. Las acciones genéricas las aplica el core a cualquier documento gobernado. Las acciones específicas son de cada módulo y se declaran como una acción genérica más una clase de cambio o una condición. Base: los 71 permisos de capabilities.json y las 34 tools del MCP de curriculum-design y curriculum-mapping.
Acciones genéricas por estado de vigencia
Acción | Sin vigencia | Programado | Vigente | En extinción | Cerrado
Editar un campo (updateInstance) | Directo | Según clase | Según clase | Según clase | No
Agregar, editar o quitar un hijo (sección, entrada de malla, requisito, tributación, competencia) | Directo | Según clase del hijo | Según clase del hijo | Según clase del hijo | No
Reordenar o mover (position, period) | Directo | Según clase | Según clase | Según clase | No
Cambiar estado del flujo (transiciones del enum) | Según aristas y roles | Retiro sin dependientes o hacia retired | Retiro sin dependientes o hacia retired | - | No
Poner en vigencia (entrar a un estado inForce) | Desde approved, con fecha y acto | - | - | - | -
Retirar publicación (volver a authoring, *:revert) | - | Sí, sin dependientes | Sí, sin dependientes | No | No
Cerrar a nuevos usos (retired, inactivar en catálogos) | - | Equivale a retirar | Sí, con fecha | Ya cerrado | Ya cerrado
Reabrir a nuevos usos (reactivar) | - | - | - | Solo si no hay versión más nueva abierta | No
Eliminar el documento (deleteInstance, soft-delete) | Sí, sin referencias | No: retirar publicación | No: cerrar | No | Nunca
Corregir (*:correct + comentario) | Directo | Vía corrección | Vía corrección | Vía corrección | No
Ajustar (ChangeRequest) | Directo | Vía ajuste | Vía ajuste | Vía ajuste, aplica a quienes siguen | No
Nueva versión (asNewVersion) | No: se edita directo | Sí, si es la última | Sí, si es la última | Sí, si es la última | No
Clonar (prefillFrom, documento nuevo) | Sí | Sí | Sí | Sí | Sí
Usar desde otro documento (malla, sílabo, adopción, matrícula) | No | Solo usos que empiezan desde su inicio | Sí | Solo dependientes existentes | No
Leyenda: Permitido · Según clase del campo · Solo por vía controlada · Con condición · No permitido
"Según clase del campo" significa que la acción no tiene una sola respuesta: depende de la clase de cambio (changeClass) declarada para el campo que se toca (ver Vías de cambio). En el plan ICI v1 vigente: el nombre es correctable, así que se corrige; el semestre de una asignatura es adjustable, así que pide un ajuste; los créditos totales son structural, así que piden una nueva versión. Si en una misma edición se tocan campos de distinta clase, manda la más exigente.
La edición masiva, la carga por Excel y las tools del MCP no son acciones distintas: son canales. Aplican las mismas reglas que la acción que ejecutan.
Acciones específicas por módulo
Plan de estudios y malla (curriculum-design)
Agregar o quitar asignatura cd_add/remove_plan_entries_batch | Reforma si es obligatoria · Ajuste si es electiva
Mover asignatura de periodo planEntry-move · period | Ajuste
Cambiar o crear línea formativa categoryId · requirementCategory | Ajuste
Sobrescribir créditos de una entrada planEntry.credits | Reforma (cambia los créditos totales)
Cambiar modo de progresión progression | Reforma (hoy PROGRESSION_LOCKED_NONEMPTY)
Editar requisitos requirement | Ajuste
Editar tributación CompetencyAlignment · bulkApply | Ajuste (el gate de suma 100 se mantiene)
Matricular estudiante PlanEnrollment · Initial | Uso (solo en la versión abierta a ingreso)
Migrar estudiante de versión PlanEnrollment · PlanChange | Uso (destino abierto y con equivalencias)
Programa de asignatura (curriculum-design)
Cambiar resultados de aprendizaje LearningOutcome | Reforma
Cambiar créditos u horas Activity.credits | Reforma
Cambiar evaluación EvaluationComponent | Ajuste (el gate de pesos se mantiene)
Contenidos, sesiones, modalidad Content · Session · Modality | Ajuste
Bibliografía Bibliography | Ajuste
Agregarlo a una malla (selector de malla) | Uso (versión vigente o programada)
Crear plantilla de formulario cd_create_formtemplate_for_activity | Uso (no modifica el programa)
Sílabo del periodo (curriculum-design)
Crear sílabo desde el programa Offering | Uso (programa vigente en ese periodo)
Publicar, archivar, revertir offering:publish · archive · revert | Transiciones con permiso propio
Cambiar evaluación o fechas de evaluación | Permitido con registro durante el periodo; la institución puede activar el bloqueo desde el inicio
Cambiar calendario o recursos | Permitido con registro
Cualquier cambio tras el cierre del periodo | No
Matriz de competencias (curriculum-mapping)
Agregar o quitar competencias cm_upsert_competency_tree · cm_delete_competency_nodes | Reforma
Cambiar la configuración de medición (escala, nivel, modos de agregación) | Reforma (cambia cómo se mide)
Redacción de descriptores | Ajuste
Rúbricas dimensions | Ajuste
Cambiar estado cm_set_matrix_status | Transición con roles
Adopción de matrices (curriculum-mapping)
Adoptar en planes cm_add_matrix_adoptions_by_plan · by_criterion | Uso (matriz vigente; plan no cerrado)
Eximir o cambiar alcance exemption · scope | Ajuste de la adopción
Cerrar adopción cm_close_matrix_adoptions | Permitido (es cerrar vigencia)
Quitar adopción cm_remove_matrix_adoptions | Condición (solo si nunca estuvo vigente, ya existe)
Reconciliar cm_reconcile_adoptions · apply | Mismas reglas que adoptar y cerrar
Escalas y niveles (curriculum-mapping)
Agregar un nivel cm_upsert_development_level | Ajuste (si ya se usa en mediciones)
Cambiar umbrales o quitar niveles | Reforma (performancescale:version ya existe)
Inactivar cm_set_*_active | Permitido (cierra nuevos usos)
Borrar cm_delete_* | Condición (solo si nunca se usó)
Duplicar cm_duplicate_* | Permitido (crea uno nuevo)
Fuera de este catálogo por ahora: academic-scheduling (secciones que usan el programa de asignatura), uengagement (estado de la oferta) y la futura medición de logro (Learning Assessment), que consume matrices y escalas. Hay que sumarlos antes de cerrar el contrato del guard.
```
