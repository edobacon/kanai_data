---
id: TICKET-148-SPEC
project: up1
ticket: TICKET-148
status: approved
---

# cd: cerrar dos huecos del CRUD generico (Activity CREATE publicado y Offering CREATE)

## Resumen ejecutivo

Se corrigen dos huecos N1 del CRUD generico de cd: (1) un create generico de Activity puede nacer con status 'Active' salteando el guard I1 de publicacion, y (2) un create generico de Offering saltea los checks de recordType='Course' y de code unico por (activityLineId, termId) que hoy solo viven en createSyllabusOffering. Ambos se cierran en codigo dentro de validateSectionCreate (sectionValidation.resolver.js), forzando Draft en Activity y extrayendo los dos checks de Offering a un helper puro compartido con createSyllabusOffering. NO se toca el modelo de datos (sin migraciones, sin @@unique), ni updateInstance, ni CurricularLink/InstructionalComponentType, ni la documentacion de integridad (fuera de alcance del request). Se verifica con tests unitarios sobre validateSectionCreate y el helper, mas regresion que fija el comportamiento actual de createSyllabusOffering y de los creates legitimos (Activity en Draft, planEntry).
ADVERTENCIA (fuera de alcance, no implementado): el trade-off de carrera/INSERT crudo queda asumido por decision del request; CurricularLink e InstructionalComponentType quedan a confirmar con PO; los docs 'server-side-integrity.md' y 'mcp-object-contract.md' quedan desactualizados hasta un ticket aparte.

## Requirements

### REQ-01 `confirmed`
> Fuente: curriculum-design/logic/sectionValidation.resolver.js:127 (validateSectionCreate); curriculum-design/logic/polymorphicUpdate.resolver.js:439-456 (assertActivityEvaluationsOnPublish); curriculum-design/config/objects/activity.json:134-140 (status libre en create)

Un create generico de Activity (createInstance / up1_create_object) no puede producir una Activity publicada sin pasar por el guard I1: validateSectionCreate fuerza status='Draft' en el payload de create cuando objectType === 'Activity', dejando la publicacion exclusivamente como transicion via updateInstance (donde assertActivityEvaluationsOnPublish ya corre).

### REQ-02 `confirmed`
> Fuente: curriculum-design/logic/syllabus-offering.resolver.js:127-189 (createSyllabusOffering; recordType :157-161, duplicado :166-175); curriculum-design/logic/sectionValidation.resolver.js:278,288 (dispatch por objectType en validateSectionCreate)

Un create generico de Offering (createInstance / up1_create_object) se rechaza con el mismo criterio que createSyllabusOffering cuando (a) el activityId referenciado no es una Activity con recordType 'Course', o (b) el code ya existe para el mismo par (activityLineId, termId); la regla vive en UN solo helper puro consumido por ambos caminos (dominio y generico), sin duplicar logica y sin tocar el modelo de datos.
## Tasks

#### S1.T1 — Fijar el baseline: leer validateSectionCreate (sectionValidation.resolver.js:127,278,288) y createSyllabusOffering (syllabus-offering.resolver.js:127-189) y escribir los tests de regresion que congelan el comportamiento ACTUAL antes de tocar nada: dispatch existente de validateSectionCreate (creditRange, tests/unit/creditRange.test.js) y los dos rechazos de createSyllabusOffering (recordType no-Course y code duplicado) con sus mensajes/codigos exactos. Deben pasar en verde contra el codigo sin modificar.
Contrato: rollback: Borrar los archivos/casos de test agregados; no hay cambios de codigo productivo en esta task.. Status: done

#### S1.T2 — Cerrar el hueco 1: en validateSectionCreate (sectionValidation.resolver.js) agregar el dispatch objectType === 'Activity' para el create que fuerce status = 'Draft' en el payload, dejando la publicacion como transicion exclusiva de updateInstance. Sin tocar activity.json ni el schema.
Contrato: rollback: Revertir el bloque agregado en sectionValidation.resolver.js (git checkout del archivo); el create vuelve al comportamiento previo sin efectos residuales (no hay migracion ni estado persistido nuevo).. Status: done

#### S1.T3 — Cerrar el hueco 2: extraer de createSyllabusOffering (syllabus-offering.resolver.js:157-161 y :166-175) los dos checks (activity.recordType === 'Course' y unicidad de code por (activityLineId, termId) via lookup del par) a un helper puro unico, hacer que createSyllabusOffering lo consuma en lugar de su logica inline (preservando mensajes y codigos de error), y agregar el dispatch objectType === 'Offering' en validateSectionCreate que invoque ese mismo helper. Sin @@unique ni cambios en Offering.json.
Contrato: rollback: Revertir syllabus-offering.resolver.js, sectionValidation.resolver.js y eliminar el archivo del helper (git checkout / rm); createSyllabusOffering vuelve a su logica inline original y el generico a su comportamiento previo.. Status: done

#### S1.T4 — Tests y regresion del cambio: unit tests de los casos de REQ-01 (Active forzado a Draft, Draft explicito, sin status, y que el guard de update sigue intacto) y de REQ-02 (recordType no-Course rechazado, code duplicado rechazado, happy path, code duplicado en otro termId/activityLineId aceptado), mas re-correr los tests de baseline de la task 1 para confirmar que createSyllabusOffering y el dispatch previo de validateSectionCreate no cambiaron de contrato. Reportar suites con estado y totales.
Contrato: rollback: Borrar los tests agregados en esta task; el codigo productivo queda intacto.. Status: done
## Sessions

### Session 1 · T1 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4
