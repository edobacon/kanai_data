---
id: KANAI-KB7
project: kanai_self
type: ticket
status: in_progress
work_type: implement
external: KANAI-KB7
tier: T2
autopilot: autonomous
---

## Request

Implementar la promocion de learns a records (capacidad KB-7 del plan de portabilidad DKC->kanai).

Cuando un learn se procesa, se debe poder PROMOVERLO a un record tipado (rule | bug | decision) en el
store, para que el conocimiento quede indexado y reutilizable (DET-39 de DKC).

1. En server/repo/learns.ts, agregar una funcion promoteLearn(learnId, input, database?) donde input =
   { type: 'rule'|'bug'|'decision', title: string, module?: string }. Debe: crear un record (tabla
   records) con projectId del ticket del learn, el type dado, module (o el del learn si aplica), title,
   y body = el body del learn; y actualizar el learn: status='refined', refinedTo = id del record creado.
   Devolver el record creado. Usar ids deterministas y transaccion/orden seguro.
2. Endpoint POST /api/learns/[id]/promote.post.ts que recibe { type, title, module? } y llama a
   promoteLearn; valida input; responde el record creado o 404 si el learn no existe.
3. Un test unit (tests/unit/promote-learn.test.ts) que: seedea un learn, lo promueve a rule, y afirma
   que se creo el record (type, body, title) y que el learn quedo refined con refinedTo apuntando al record.

Respetar el schema existente (records, learns en server/db/schema.ts). No romper tests existentes.

## Criterios de aceptacion
- promoteLearn crea el record con el body del learn y marca el learn refined+refinedTo.
- El endpoint responde el record; 404 si el learn no existe.
- El test nuevo pasa y typecheck queda limpio.
