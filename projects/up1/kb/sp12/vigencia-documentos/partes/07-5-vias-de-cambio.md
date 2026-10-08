---
id: DOC-vigencia-documentos-07-5-vias-de-cambio
project: up1
type: doc
module: curriculum-design
tags: [vigencia, workflow, estados, versionamiento, curriculum-design, curriculum-mapping, sp12]
source: https://claude.ai/artifact/RQyrVMBvpq7WQTQb15CHdo
---
# Parte 07: 5 · Tres vías para cambiar algo vigente

> Grupo: Parte funcional · Parte 7 de 17 · Líneas 687 a 758 del original · [Índice](../00-INDICE.md)

**Ver en HTML (mismo estilo del original):** [07-5-vias-de-cambio.html](07-5-vias-de-cambio.html)

## Qué dice esta parte

Corrección (`correctable`, mismo registro, con comentario), ajuste (`adjustable`, solicitud de cambio con aprobación liviana y foto del antes) y reforma (`structural`, nueva versión). Cada campo declara su clase; lo no declarado se trata como `structural` (fail-closed). Incluye el retiro de publicación (solo Programado o Vigente y sin dependientes) y la distinción clonar (entidad nueva) frente a versionar (nueva versión de la misma entidad). Quedó **en debate** el mecanismo de excepción para volver atrás.

## Dónde se habló en la reunión (6 oct 2026)

00:12:40 a 00:15:16, 00:41:27 a 00:46:14 y 01:04:30 a 01:10:40. Transcripción: `records/TRANSCRIPT-2026-10-06-modelamiento-flujo-estatus-reglas-uassessment.md`.

## Verificado contra el código (8 oct 2026)

- `REVERT_HAS_ACTIVE_DEPENDENTS` existe (`curriculum-design/errors.js`, `helpers/documentDependents.js`): el retiro generaliza una regla que ya vive en el mod.
- `requiresComment` aparece declarado en transiciones de `activity.json` pero el motor de core aún no lo hace cumplir.

## Decisiones y preguntas ligadas

D3 (flujo del ajuste). Umbral exacto entre corrección y reforma por campo: sin lista cerrada.

## Fragmento del documento (texto del artefacto)

```text
5 · Vías de cambio
Tres vías para cambiar algo vigente
Un documento protegido se cambia por una de tres vías. Cuál corresponde lo dice la clase de cambio (changeClass, nuevo) del campo que se toca; la institución puede reclasificar dentro de un rango. El sílabo es la excepción: es operativo y por defecto no se bloquea durante su periodo.
CorrecciónchangeClass: correctable
CuándoErrata o error materialCómoEn el lugar, capability *:correct, comentario obligatorioVersiónMisma versión y misma vigencia
"Ingenieria Civil Indutrial" → se corrige Curriculum.name. Ningún estudiante se ve afectado.
AjustechangeClass: adjustable
CuándoCambio menor según la instituciónCómoChangeRequest con aprobación liviana y foto del antesVersiónMisma versión; aplica a cohortes vigentes
Mover Cálculo II al semestre 3 y quitar un prerrequisito, con resolución de dirección.
ReformachangeClass: structural
CuándoPerfil de egreso, créditos, duración, obligatoriasCómoasNewVersion → Draft → flujo completo → publicarVersiónVersión nueva; la anterior deja de recibir ingresos (En extinción mientras tenga estudiantes)
Nuevo perfil de egreso tras la acreditación → ICI v2 desde 2027-1, con tabla de equivalencias.
¿Y si me equivoqué al publicar? Retirar la publicación
Es la única forma de volver de un estado publicado a uno de edición. No es una puerta para saltarse las reglas: solo existe mientras nadie usa el documento.
Se puede
Desde Programado o Vigente
Sin dependientes: sin matrículas, sílabos con estudiantes, adopciones ni planes vigentes que lo usen
Con el permiso *:revert y comentario obligatorio
Ej.: ICI v2 programado para 2027-1 trae un error; o un plan publicado la semana pasada que aún no matricula a nadie.
No se puede
Con dependientes: el camino es corregir, ajustar o crear nueva versión
Desde En extinción o Cerrado: ya operó y es evidencia histórica
Ej.: ICI v1 con Ana matriculada.
Qué hace el sistema
El documento vuelve a un estado authoring y queda Sin vigencia
Se limpia validFrom; el acto y la publicación anterior quedan en el historial
En el diseño del flujo de trabajo, el mantenedor solo acepta esa vuelta como "retiro" y el core le agrega la revisión de dependientes. Desde un estado retired no se permite volver
Clase por defecto de algunos campos
Curriculum.name · correctable
planEntry.period · adjustable
requirement · adjustable
Bibliography · adjustable
CompetencyAlignment.contributionPercentage · adjustable
totalCredits · structural
totalPeriods · structural
GraduationProfile · structural
LearningOutcome · structural
planEntry obligatoria (alta/baja) · structural
CompetencyNode (alta/baja en matriz) · structural
¿Por campo de cada objeto?
Sí, de cada objeto gobernado: el documento y sus hijos. Pero no hay que declararlos todos. Cada objeto trae una clase por defecto (structural, fail-closed) y solo se declaran las excepciones. Campos técnicos (auditoría, fórmulas, derivados) quedan fuera porque ya son de solo lectura.
Tres niveles de declaración
Campo: Curriculum.name correctable, totalCredits structural.
Subtipo completo: toda la sección Bibliografía adjustable; toda la sección Resultados de aprendizaje structural.
Crear o borrar un hijo, con condición: quitar una asignatura de la malla es structural si es obligatoria y adjustable si es electiva.
El mod fija un rango por campo y la institución puede moverse dentro de él.
```
