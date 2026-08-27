---
id: KANAI-KB7-SPEC
project: kanai_self
ticket: KANAI-KB7
status: approved
---

# Promover learns a records tipados (KB-7)

## Requirements

#### REQ-01 `confirmed`
> Fuente: Request KANAI-KB7 §1; server/db/schema.ts:learns; server/db/schema.ts:records; server/repo/learns.ts; server/repo/records.ts; DET-32; DET-39
promoteLearn(learnId, input, database?) debe crear un record con el projectId del ticket, type y title del input, body del learn y module del input o del ticket cuando no se provea; después debe actualizar el learn a status refined con refinedTo igual al id determinista del record y devolver el record creado.

#### REQ-02 `confirmed`
> Fuente: Request KANAI-KB7 §2; server/api/records/[id].get.ts; server/repo/learns.ts; server/db/schema.ts:RECORD_TYPES
POST /api/learns/[id]/promote.post.ts debe validar { type, title, module? }, llamar a promoteLearn, devolver el record creado y responder 404 cuando el learn no existe.

#### REQ-03 `confirmed`
> Fuente: Request KANAI-KB7 §3 y criterios de aceptación; server/db/schema.ts; tests/unit/learns.test.ts; tests/unit/records.test.ts; package.json
La promoción debe integrarse respetando el schema existente, mantener typecheck limpio y no romper la suite de tests existente.

## Tasks

#### S1.T1 — Aplicar pre-aprobación independiente del spec completo: revisar alineación de REQ-01..REQ-03 con el request inmutable, sourceRef, casos de error, regresión y cobertura de tasks; archivos/artefactos: spec del ticket y plan persistido en KANAI-KB7; validación: juez devuelve approved antes de ejecutar código.
Contrato: rollback: Descartar el veredicto y restaurar el borrador previo del spec/plan si el juez devuelve iterate; no modificar código de producción.. Status: pending

#### S1.T2 — Implementar promoteLearn en server/repo/learns.ts usando los schemas/tablas existentes, resolver el ticket para projectId y module fallback, generar id determinista, crear el record y actualizar el learn en transacción u orden seguro; files: server/repo/learns.ts; validation: tests/unit/promote-learn.test.ts y typecheck; scope: no cambios de schema salvo evidencia de incompatibilidad.
Contrato: rollback: Revertir únicamente los cambios de server/repo/learns.ts; la operación no requiere migración porque usa records y learns existentes.. Status: pending

#### S1.T3 — Crear tests/unit/promote-learn.test.ts con DB SQLite en memoria y migraciones existentes; cubrir promoción a rule, mapeo body/title/type, refined/refinedTo, fallback de module y learn inexistente; files: tests/unit/promote-learn.test.ts; validation: pnpm vitest run tests/unit/promote-learn.test.ts.
Contrato: rollback: Eliminar el archivo de test nuevo sin tocar tests existentes ni código de producción.. Status: pending

#### S2.T1 — Implementar POST /api/learns/[id]/promote.post.ts con validación Zod de type/title/module, llamada a promoteLearn, respuesta del record y mapeo de learn inexistente a HTTP 404; files: server/api/learns/[id]/promote.post.ts; validation: typecheck y tests del endpoint.
Contrato: rollback: Eliminar el endpoint nuevo; promoteLearn y la tabla existente permanecen sin cambios.. Status: pending

#### S2.T2 — Completar cobertura de endpoint y regresión: probar respuesta exitosa, module opcional, 404 para learn inexistente, 400 para payload inválido, además de ejecutar la suite existente y typecheck; files: tests/unit/promote-learn.test.ts y, si el patrón del proyecto lo requiere, test unitario del handler; validation: pnpm vitest run, pnpm typecheck.
Contrato: rollback: Revertir solamente las aserciones o archivo de tests añadidos para endpoint; conservar la implementación validada de promoteLearn.. Status: pending

#### S2.T3 — Ejecutar gate de sesión: verificar archivos modificados, migraciones no requeridas, tests reales verdes, typecheck limpio y consistencia de id/refinedTo; registrar resultado de revisión de calidad y el rollback aplicado; files: server/repo/learns.ts, server/api/learns/[id]/promote.post.ts, tests/unit/promote-learn.test.ts; validation: pnpm vitest run y pnpm typecheck.
Contrato: rollback: Si falla el gate, revertir la unidad lógica de la sesión y mantener el ticket abierto para iteración; no cerrar ni marcar tasks completas con evidencia fallida.. Status: pending
