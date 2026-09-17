---
id: BUG-academic-scheduling-retired-assignment-visible-UPONE-1831
project: up1
type: bug
module: academic-scheduling
---

Causa raiz: al retirar (soft delete) una fila de asignacion se dejaba su instructorId/resourceId intactos, y los includes anidados de otras queries bypasean el filtro de soft-delete, asi que la pestaña de secciones seguia mostrando docente/sala de filas ya retiradas. Fix: vaciar los campos de la fila ANTES de retirarla. El orden importa porque la reescritura del delete corre fuera de la transaccion: vaciar primero produce deadlock hasta que la transaccion hace timeout.

**sourceRef:** b61038f + logic/schedule/unassignDimension.js:169 (retireAssignments).
