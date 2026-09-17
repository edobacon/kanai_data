---
id: TICKET-148
project: up1
type: ticket
status: closed
work_type: fix
module: curriculum-design
autopilot: autonomous
---

# Contexto

Durante la revision de blockGenericMutation (KB sp10) se detectaron dos objetos de cd donde una regla de negocio vive SOLO en una mutation de dominio separada y el `createInstance` generico la saltea. Son huecos N1 propios de cd, existen hoy en mainline e independientes de la rama UPONE-1758: cualquier cliente del CRUD generico (MCP, Suite, API directa) los explota.

**Decision de diseño (fijada):** se resuelve todo en codigo, en los overrides del CRUD generico que cd ya tiene. NO se toca el modelo de datos (sin migraciones ni constraints nuevas). Como los overrides corren dentro de `createInstance`/`updateInstance`, cubren todas las puertas GraphQL (MCP, Suite, API); solo un INSERT por SQL/Prisma crudo quedaria fuera, que no es vector de cliente.

Ref KB: `kb/sp10/cd-huecos-generico-que-cerrar-y-como.md`.

# Hueco 1: activity en CREATE (publicacion sin validar)

El guard de publicacion (I1, suma de pesos del arbol == esperado) corre solo en `updateInstance` cuando la transicion es a `status Active` (`assertActivityEvaluationsOnPublish`, `polymorphicUpdate.resolver.js:439-456`). El create no dispatcha `objectType === 'Activity'` en `validateSectionCreate`, y `objects/activity.json:134-140` deja `status` libre en create.

**Impacto:** `up1_create_object('Activity', { status: 'Active', ...arbol invalido })` crea una Activity ya publicada sin pasar por el chequeo I1.

**Cierre (codigo):** forzar `status = 'Draft'` en el create dentro de `sectionValidation.resolver.js` (una Activity nace en Draft; publicar es siempre una transicion via update, donde el guard ya vive). Sin tocar schema. Trivial.

# Hueco 2: Offering en CREATE (recordType y unicidad de code)

Las reglas "activityId debe ser Activity.recordType === 'Course'" y "code unico scoped por (activityLineId, termId)" viven solo en `createSyllabusOffering` (`syllabus-offering.resolver.js:127-189`; recordType `:157-161`, duplicado `:166-175`). `objects/Offering.json` no declara @@unique para code, y `sectionValidation.resolver.js` no dispatcha `Offering` en create.

**Impacto:** `up1_create_object('Offering', { activityId: <Service>, code: 'X', recordType: 'Syllabus', ... })` saltea el chequeo de recordType=Course y el de duplicado de code.

**Cierre (codigo):** extraer los dos checks a un helper puro que hoy consuma `createSyllabusOffering`, y llamarlo desde un dispatch `objectType === 'Offering'` en `validateSectionCreate`. Una sola fuente de verdad, sin duplicar la regla, sin tocar schema. La unicidad de code se chequea por lookup del par en el resolver.

Trade-off asumido: al no subir la unicidad a la DB, un INSERT por SQL crudo no la respetaria, y hay una ventana de carrera teorica bajo concurrencia. Coherente con como cd ya opera el resto de sus reglas de resolver sin backstop de DB.

# Fuera de alcance / a confirmar aparte

- CurricularLink e InstructionalComponentType: sin reglas conocidas; confirmar con PO si deberian tener alguna (ej. anti-duplicado de CurricularLink mismo par+tipo).
- Actualizar docs de integridad (`server-side-integrity.md`, `mcp-object-contract.md`, 2026-06-19 desactualizados) al cerrar.

# Criterio de aceptacion

1. Un create generico de Activity con `status: 'Active'` no crea una Activity publicada sin validar (queda en Draft o se rechaza).
2. Un create generico de Offering con activityId no-Course, o con code duplicado en el mismo (activityLineId, termId), se rechaza con el mismo criterio que `createSyllabusOffering`.
3. La regla de Offering vive en un solo helper compartido por ambos caminos (dominio y generico), sin duplicar.
4. Sin cambios en el modelo de datos.
5. Los flujos legitimos (create de Activity en Draft, planEntry, etc.) siguen funcionando.
