---
id: TICKET-145
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1757
tier: T2
module: curriculum-design
autopilot: autonomous
verification_policy: ask
teach_policy: ask
draft_policy: skip
review_policy: auto
story_points:
  estimated: 3
  executed: 3
---

# Migracion server-side de invariantes de Curriculum Design (camino A) + validacion

> Referencia externa: UPONE-1757 (Curriculum Design | MCP | Diagnostico de reconciliacion a nueva arquitectura MCP). Epica UPONE-1267.

## Nota de alcance (importante)
El ticket Jira 1757 esta declarado como **diagnostico + spike** ("NO migra codigo productivo"). Este ticket de Kanai, por decision del dev (assignee de 1757), **ejecuta la migracion real** server-side que 1757 dejaba para tickets de ajuste, siguiendo el plan ya redactado en `sp10/UPONE-1757-plan-validacion-server-side`. Pendiente: avisar al PO (Esteban Cortes) que 1757 pasa a ejecutar la migracion, o formalizar el ticket de ajuste en Jira.

## Objetivo
Aplicar server-side toda la logica de negocio de Curriculum Design que hoy es un invariante real pero vive solo en el cliente (frontend del mod), de modo que la regla valga por **cualquier via** (UI, API GraphQL directa, CRUD generico y MCP), y validar en cada fase que:
1. la regla ya no se puede saltear por ninguna via (garantia nueva), y
2. el comportamiento previo del usuario sigue vigente (no-regresion).

## Principio rector
Cada regla se escala al **override de `createInstance` / `updateInstance` / delete del resolver del mod** (nivel N3). Con el invariante en el override, el motor generico del MCP (`up1_create/update/delete_object`) ya pasa por el gate: el objeto queda en N0 y `blockGenericMutation` (camino B) resulta innecesario para cd. Solo si una regla no puede vivir en el override se recurre a camino B (coordinado con UPONE-1758). Es camino A puro: resolvers del mod, no toca el motor del repo `mcp` salvo excepcion descubierta en F0.

Regla comun: la logica client-side (`.logic.ts`) NO se borra al migrar; queda como pre-check de UX. Lo que se agrega es el enforcement server-side que la vuelve infalsificable.

## Alcance
**Dentro:** invariantes de la malla curricular hoy solo-client (casos A-CD-1..6) mas las dos brechas parciales del resolver (A-CD-7 R0, A-CD-8 R1).

**Fuera (con motivo):**
- Camino C (UX/presentacion pura): `deriveLevel`, `recalcPeriodPosition` (comodidad), `guidedAdd`, `editEntryModal`, `blockSelect`. Cada uno pasa por el gate de clasificacion de F0; gana A solo si saltado corrompe datos.
- Camino B (`blockGenericMutation` / fichas / `registerExtra` del repo `mcp`): solo entra si F0 encuentra una regla que no admite override; se coordina con UPONE-1758.
- Core Extensions (`object-manager`): enforcement de `requiresComment` y del enum `RecordType`. Se coordinan con core; no son ajuste de mod.
- Exposicion de la malla por MCP como fichas nuevas: este ticket endurece el backend, no agrega superficie MCP.

## Casos (confirmar file:line al ejecutar)
| Caso | Invariante | Origen (client) | Destino (server) | Fase |
|---|---|---|---|---|
| A-CD-1 | Editar planEntry solo si el plan esta en Draft (create/update/delete) | `curriculumMesh.logic.ts:362` | override create/update/delete de planEntry | F1 |
| A-CD-2 | Unicidad (planId, activityId) | `activityPicker.logic.ts:17` | `@@unique` en modelo o guard en batch/single | F1 |
| A-CD-4 | Forma: electiva exige bloque; credito no negativo | `editEntryModal.logic.ts:71` | validacion de forma en create/update | F1 |
| A-CD-3 | Borrado bloquea si deja requisitos insatisfacibles | `deletionImpact.logic.ts:238` | guard en `deletePlanEntriesBatch` + delete single | F2 |
| A-CD-5 | Move con renumerado atomico de period/position | `recalcPeriodPosition.logic.ts:76` | mutation dedicada `movePlanEntry` (transaccional) | F3 |
| A-CD-6 | Sanitizar HTML de CustomSection en el write (XSS) | `RichTextRenderer/sanitizeHtml.ts` | sanitizacion en el write del resolver | F4 |
| A-CD-7 | R0: cambiar `progression` con malla no vacia se esquiva por path rt | `curriculum-update:112` (`RT_PATTERN:207`) | extender guard al path `rt__Plan__curriculum` | F5 |
| A-CD-8 | R1: `createSyllabusOffering` valida sesion pero no RBAC de objeto | `syllabus-offering.resolver.js` | agregar `withObjectAuth` | F5 |

## Fases (atomicas, cada una deja el sistema funcional)
- **F0 Preparacion y baseline:** refrescar watermark (`git fetch` cd, revisar commits posteriores a `8a151e7`), gate de clasificacion A vs C de los casos ambiguos, materializar submodulo cd, levantar ambientes (:4000/:3000/:4100), login de test, capturar baseline de comportamiento como oraculo de regresion. Sin tests nuevos: fijar verde de partida (suite mod + E2E MCP).
- **F1 Guards de estado y forma de planEntry (A-CD-1/2/4):** tres guards en el override que ya corre para planEntry (`planEntry-batch:90-135` y single), sin resolver paralelo (mantiene N0).
- **F2 Borrado seguro (A-CD-3):** portar impacto de borrado a `deletePlanEntriesBatch` (y single); rechazo tipado cuando dejaria requisitos insatisfacibles.
- **F3 Move atomico (A-CD-5):** `movePlanEntry` con renumerado transaccional. Depende de F1 (unicidad).
- **F4 Sanitizacion HTML server-side (A-CD-6, seguridad):** whitelist en create/update de CustomSection antes de persistir; render sanitizado se mantiene (defensa en profundidad).
- **F5 Brechas parciales (A-CD-7 R0, A-CD-8 R1, fixes):** extender guard de progression al path rt; agregar `withObjectAuth` en `createSyllabusOffering`.
- **F6 Cierre y coordinacion:** veredicto `blockGenericMutation` por objeto (N0 esperado ⇒ innecesario para cd); Core Extensions registrados para core. Regresion completa verde.

## Estrategia de validacion (todas las fases)
1. **Unit del guard** (funcion pura, valores concretos; el test debe fallar si el guard no corre).
2. **Integracion del resolver** (con DB de test): el guard vive en el override y corre para create/update/delete, single y batch.
3. **Bypass cross-client (garantia nueva):** la misma operacion por (a) UI, (b) `updateInstance`/`deleteInstance` generico con alias `RecordType`, (c) `up1_*_object` del MCP. Las tres deben rechazar. Si (b) o (c) pasan, la regla quedo en un `*Validated` esquivable ⇒ mover al override o declarar camino B.
4. **Regresion server-side existente:** suite de `planEntry-batch` y demas resolvers cubiertos sigue verde.
5. **Regresion de comportamiento de usuario:** contra el baseline de F0, el flujo en la UI produce el mismo resultado observable.
6. **Harness E2E del MCP:** read-back + 4 fronteras en paridad tras cada fase.

Criterio de no-regresion checkeable: operaciones legitimas siguen funcionando (mismos inputs ⇒ mismo resultado que baseline); operaciones que la UI ya bloqueaba siguen bloqueadas, ahora respaldadas por backend; suite mod + E2E MCP verdes; ninguna capacidad expuesta cambia en silencio.

## Contexto congelado
- **Watermark:** analisis valido hasta `curriculum-design origin/develop @ 8a151e7` (PR #54, UPONE-1700), `mcp @ 30a032a`. Al retomar: `git fetch` cd y reclasificar cualquier caso cuya regla ya haya migrado (H1).
- **Ambientes:** backend GraphQL / object-manager `:4000`, front suite `:3000`, MCP online `:4100`. No hacer checkout/pull sobre checkouts vivos mientras esten en uso; usar worktrees de solo lectura para leer y ramas nuevas para ejecutar.
- **Login de test:** email del dev + `clerk_test` (`eduardo.bacon+clerk_test@uplanner.com`) + OTP fijo `424242`. El tenant real (UPU) exige membresia.
- **Submodulo:** `mods/curriculum-design` es submodulo del monorepo up1; materializar antes de ejecutar.
- **Patron a imitar:** overrides vigentes de cd (`polymorphicUpdate`, `sectionValidation`) y `assertActivityNotInActivePlan`. Precedente custom-logic aislada (solo si aparece caso B): `mods/academic-scheduling/ai/rule-value-upsert.js`.
- **Ya server-side (red de regresion, no se toca):** modalidad, arbol de evaluacion, publicar Activity, linea de formacion, curriculo (unicidad linaje), perfil de egreso singleton, requisitos, prerrequisitos, alta/baja en lote (`planEntry-batch:90-135`), estado, RBAC objeto-nivel.

## Riesgos y reversibilidad
- Regla mal clasificada (A que era C): mitiga el gate de F0 (corrompe dato ⇒ A).
- Regla en `*Validated` esquivable: la detecta la prueba de bypass cross-client (capa 3).
- Cambio de semantica de unicidad (A-CD-2): pasar de (planId+period+position) a (planId+activityId) puede rechazar datos existentes; confirmar semantica y correr contra datos reales de UPU antes del `@@unique`.
- Renumerado atomico (A-CD-5) bajo concurrencia: transaccion + unicidad de F1.
- Reversibilidad: cada fase es un cambio localizado en override/resolver, en rama propia; revertir = revertir el commit de la fase. La regla client-side se conserva.

## Dependencias
- UPONE-1758 (Curriculum Mapping): comparte `blockGenericMutation`; si cd necesita B, coordinar cual ticket lo implementa (una sola vez).
- Core Extensions (`object-manager`): `requiresComment` y enum `RecordType`, fuera de este plan.
- OAuth de object-manager: ya mergeado (`1ed7c22b`, PR #507); no es dependencia activa.
- Regla del proyecto: `RULE-server-side-logic-mcp-ready`.

## Referencias sp10/sp9
- Plan de ejecucion: `sp10/UPONE-1757-plan-validacion-server-side`.
- Contrato/diagnostico: `sp10/UPONE-1757-detalle`, `sp10/UPONE-1757-pre-intake`.
- Dominio: `sp9/ANALISIS-backend-vs-client-cd-cm-endurecimiento-mcp` (matriz + casos A-CD-1..8), `sp9/PLAN-migracion-cd-cm-al-mcp-online`, `sp9/PLAN-integracion-elric-mcp-por-capas`.
- Endurecimiento MCP camino B (referencia): `sp10/PLAN-blockGenericMutation-mcp`.

## Adendas al request

### Adenda 1 - 2026-09-10 - eduardo.bacon

Enmienda a REQ-13 (alcance visual): el ticket deja de ser estrictamente "backend puro / sin superficie visual". Se amplía para incluir UN fix de seguridad en la capa client-side: se blinda el sanitizador de render `modsComponents/RichTextRenderer/sanitizeHtml.ts` migrándolo de denylist a allowlist de esquemas de href, con paridad exacta al fix server-side de A-CD-6 (`logic/helpers/htmlSanitizer.js`). El cambio toca 1 archivo de UI (`sanitizeHtml.ts`) + su test (`tests/integration/sanitize-html.test.ts`), no introduce componentes/estilos/tokens/Storybook nuevos y no requiere verificación de maqueta. REQ-13 se lee ahora como: "backend + 1 fix de sanitización client-side por paridad de seguridad".

**Motivo**: El review (kn-dredd) confirmó que el sanitizador client-side comparte el mismo bypass XSS (control-char ofuscando javascript:) que se cerró server-side; siendo la defensa primaria del render, se decidió (dev, opción B) blindarlo en el mismo ticket por seguridad en lugar de diferirlo a un follow-up.
