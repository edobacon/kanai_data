---
id: TICKET-138
project: up1
type: ticket
status: closed
work_type: implement
module: mcp
autopilot: manual
---

# Testeabilidad automatizada E2E de Elric (MCP up1)

## Request

Retomar el follow-up de SP9 (sp9/FOLLOWUP-mcp-testing-automatizado.md) y dejar listo el testing automatizado E2E del servidor MCP (Elric): una mecanica que ejecute operaciones reales del MCP contra una instancia de up1 y verifique el efecto en la plataforma (no solo el retorno de la funcion), cubriendo las 4 fronteras del contrato (permisos, preview->commit, resolucion semantica, higiene). Ademas: (1) exigir E2E para toda funcionalidad nueva (gate en el checklist de extension) y (2) ampliar la documentacion a lo que se puede instruir (como se escribe una prueba) y lo que se debe exigir (que prueba es obligatoria). Entorno decidido: up1 local del dev + Clerk test mode. Ampliar la cobertura del piloto a la escritura de alto riesgo de curriculum-design.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | Nueva capa de testing + docs (no cambia logica de dominio) |
| Modulo principal | mcp |
| Modulos afectados | mcp (repo up1-mcp), curriculum-design (dominio piloto) |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | Clerk test mode (+clerk_test + OTP 424242) funciona por el path `authenticate` del MCP contra local | Confirmada | Spike Fase 0: sesion valida, getMyPermissions -> eduardo.bacon@uplanner.com, rol Admin, 776 caps |
| H2 | Un E2E que corre el servidor MCP real (stdio) verifica el efecto en plataforma que los mocks no cubren | Confirmada | 25 casos verdes contra up1 local; read-back por path real; 0 residuos post-teardown |

### Context found

- Estado inicial: 17 archivos unit (logica pura con dobles), 0 E2E. Deuda declarada en `up1-mcp/docs/ROADMAP.md` ("Tests de integracion automatizados contra un up1 efimero") y `docs/DEVELOPMENT.md` §5 ("NO hay e2e automatizado").
- Backend local vivo en `http://localhost:4000/graphql`, tenant UPU. Clerk dev `neutral-boxer-92.clerk.accounts.dev`.
- Activity acepta `delete_object` generico (contract con `validatedMutations: {}`); Curriculum NO (`blockGenericMutation`) y no expone delete por MCP.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | feat/mcp-e2e-testing (repo uplanner/mcp) |
| Base branch | main |
| DB state | up1 local, tenant UPU |
| Services | object-manager :4000; Clerk test mode (neutral-boxer-92) |
| Test data | usuario eduardo.bacon+clerk_test@uplanner.com (Admin, 776 caps) |

## Learns

> **DET-39 — learns diferidos al cierre.** El dev autorizo cerrar con skip teach. Los 5 learns quedan
> **deferred**: no se pierden (estan documentados en este ticket y encodeados en las docs del repo —
> `CLAUDE.md`, `docs/DEVELOPMENT.md` §5.1, `docs/EXTENDING.md` — y en las suites E2E). Follow-up:
> promover #2 y #3 a rules de `mcp` si se decide formalizarlos como constraints consultables.

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| 1 | Clerk test mode (+clerk_test, OTP 424242) autentica por el path `authenticate` del MCP contra local; el usuario entra como Admin (776 caps). Habilita E2E sin humano en el loop. | Spike Fase 0 | S1 | deferred | doc: DEVELOPMENT.md §5.1 |
| 2 | El fold de acentos de `cd_search_programs` pliega solo la QUERY (stripAccents), no el dato guardado (ILIKE no pliega). Para probar el fold: guardar sin acento y buscar con acento. | Piloto | S1 | deferred | candidato a rule mcp |
| 3 | `REQUIREMENT_ACTIVITY_LOCKED_BY_ACTIVE_PLAN`: no se editan requisitos de una asignatura que pertenece a un plan publicado. Regla de negocio correcta; los E2E de requisitos crean su propia asignatura owner. | Suite requisitos | S1 | deferred | candidato a rule mcp |
| 4 | Teardown por tipo de objeto: Activity se borra por el path real (`delete_object`); Curriculum no (blockGenericMutation + sin delete por MCP) -> teardown out-of-band (`test/e2e/cleanup.ts` via deleteInstance). | Suite curriculos | S1 | deferred | doc: DEVELOPMENT.md §5.1 |
| 5 | El harness fiel corre el servidor MCP real por stdio (StdioClientTransport) y llama las tools por nombre: ejercita dispatch, visibility, schemas, preview->commit y saneo de errores, no solo funciones puras. | Diseno harness | S1 | deferred | doc: DEVELOPMENT.md §5.1 |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|
| 1 | Piloto: crear programa con nombre acentado y buscarlo sin acento | ILIKE no pliega el dato; el fold solo aplica a la query | Invertir: guardar sin acento, buscar con acento (Learn #2) |
| 2 | Requisitos sobre la primera asignatura del tenant | Estaba en un plan publicado -> LOCKED_BY_ACTIVE_PLAN | La suite crea su propia asignatura owner (Learn #3) |

## Sessions

### Session 1 — 2026-08-18 — Harness E2E + cobertura de escritura de alto riesgo

Objetivo: dejar listo el testing automatizado E2E de Elric y ampliar la cobertura a la escritura de alto riesgo de curriculum-design.

Flujo ejecutado:
1. **Fase 0 (spike de auth)**: valide contra `dist/` que `authenticate` + `submit_otp('424242')` con email `+clerk_test` establece sesion y `getMyPermissions` responde (Admin, 776 caps). Gate desbloqueado.
2. **Fase 1 (harness)**: `vitest.e2e.config.ts` (include `test/e2e/**`, serie, timeout 60s), `test/e2e/harness.ts` (clase `Elric` sobre el servidor MCP real via stdio; `e2eReady()` preflight con skip; `E2E_MARK`), script `test:e2e` en `package.json`. Guard de skip verificado apuntando a un backend inexistente.
3. **Fase 2-3 (piloto)**: `test/e2e/curriculum-design.e2e.ts` — 9 casos: lectura, ciclo escritura preview->commit->read-back->teardown, transicion de estado, y las 4 fronteras (permisos por gate de sesion, preview->commit, resolucion, higiene).
4. **Ampliacion (decision del dev "escritura de alto riesgo")**: 4 suites nuevas + `test/e2e/cleanup.ts` (teardown out-of-band):
   - `cd-sections.e2e.ts` (RecordTypes rt__): create/get/list/update/reorder/delete.
   - `cd-curriculum.e2e.ts`: clone/get/update/transition/version + version-chain (semilla existente + teardown out-of-band).
   - `cd-mesh.e2e.ts` (plan entries): add/get_mesh/update/move/remove sobre un Plan clonado.
   - `cd-requirements.e2e.ts`: manage_requirement (view/create/delete) + get_prereqs + manage_formation_line (create/delete), con asignatura owner propia.
5. **Fase 4 (gate)**: `docs/EXTENDING.md` (seccion "Obligacion de E2E para tools de escritura" + checklist + Recetas 2/3) y `CONTRIBUTING.md` (checklist de PR): E2E obligatorio para toda tool con escritura o resolucion semantica.
6. **Fase 5 (docs)**: `docs/DEVELOPMENT.md` §5.1 (como escribir un E2E + tabla de las 4 fronteras) + actualizado "Que NO cubren"; `docs/ROADMAP.md` (testing automatizado a Hecho, alcance local; "up1 efimero / CI" abierto).

7. **Auto-descubrimiento de reglas por IA** (pedido del dev): el repo tenia las reglas bien escritas
   (ONBOARDING/CONTRIBUTING/EXTENDING/DEVELOPMENT/CONVENTIONS) pero SIN archivo de auto-carga para
   agentes. Se agrego `CLAUDE.md` en la raiz (canonico, auto-cargado por Claude Code) como
   "constitucion" que enumera las exigencias no negociables y APUNTA a las docs (no duplica, para no
   desincronizar), y `AGENTS.md` que apunta a CLAUDE.md (cobertura cross-tool). Decidido: solo
   auto-carga por ahora; enforcement (CI: build+test+e2e que bloquee merge) queda como follow-up.

Verificacion independiente: `npm test` 170/170; `npm run test:e2e` 25/25 (5 archivos); residuos post-corrida = 0 en Activity y Curriculum (query por marcador `E2E-MCP`).

Estado: ejecucion completa y verde. Ticket en pausa antes de cierre por pedido del dev (hay trabajo adicional pendiente).

## Testing

### Coverage map

| Area | Suite E2E | Tools cubiertas | Status |
|------|-----------|-----------------|--------|
| Programas (piloto) | curriculum-design.e2e.ts | cd_search_programs, cd_get_program, cd_create_program, cd_list_transitions, cd_transition_program | pass |
| Secciones (rt__) | cd-sections.e2e.ts | cd_create_section, cd_get_section, cd_list_sections, cd_update_section, cd_reorder_sections, cd_delete_section | pass |
| Curriculos | cd-curriculum.e2e.ts | cd_search_curricula, cd_clone_curriculum, cd_get_curriculum, cd_update_curriculum, cd_list_curriculum_transitions, cd_transition_curriculum, cd_version_curriculum, cd_get_curriculum_version_chain | pass |
| Malla / plan | cd-mesh.e2e.ts | cd_add_plan_entry, cd_get_mesh, cd_update_plan_entry, cd_move_plan_entry, cd_remove_plan_entry | pass |
| Requisitos | cd-requirements.e2e.ts | cd_manage_requirement (view/create/delete), cd_get_prereqs, cd_manage_formation_line (create/delete) | pass |

Cobertura ~27/38 tools de cd (todo el set de escritura de alto riesgo). Fuera (menor riesgo, gate obliga E2E al tocarlas): bibliografia, silabos, perfil de egreso, clone de carrera, cd_create_curriculum directo (fixtures de institucion/carrera).

### Test cases

| # | Case | Area | Type | Expected | Actual | Status |
|---|------|------|------|----------|--------|--------|
| TC-01 | search/get de programas devuelve forma de negocio | lectura | e2e | count=programs.length, sin fugas internas | igual | pass |
| TC-02 | create sin confirm = preview y NO persiste | preview->commit | e2e | "Vista previa"; no aparece en search | igual | pass |
| TC-03 | create con confirm persiste; read-back por path real | escritura | e2e | created.id; get muestra name/code | igual | pass |
| TC-04 | transicion de estado (list->preview->commit->read-back) | estado | e2e | estado cambia | igual | pass |
| TC-05 | tool protegida sin sesion es rechazada | permisos | e2e | isError + mensaje de sesion | igual | pass |
| TC-06 | busqueda con acento encuentra dato sin acento | resolucion | e2e | encontrado | igual | pass |
| TC-07 | salida de search no filtra recordType/rt__/ext__/objectType | higiene | e2e | sin claves internas | igual | pass |
| TC-08 | secciones rt__: create/read-back/update/reorder/delete | seccion | e2e | ciclo completo persistente | igual | pass |
| TC-09 | curriculo: clone/get/update/transition/version | curriculo | e2e | ciclo completo; chain incluye nueva version | igual | pass |
| TC-10 | plan entries: add/get_mesh/update/move/remove | malla | e2e | entrada aparece, se mueve y se quita | igual | pass |
| TC-11 | requisito: view/create/view/delete + formation line create/delete | requisitos | e2e | ciclo completo, sin residuo | igual | pass |

### Test artifacts

| File | Type | Covers | Framework |
|------|------|--------|-----------|
| test/e2e/harness.ts | harness | conexion MCP real + auth + call + skip + marca | vitest |
| test/e2e/cleanup.ts | teardown | borrado out-of-band de objetos sin delete por MCP | vitest |
| test/e2e/curriculum-design.e2e.ts | suite | programas + 4 fronteras | vitest |
| test/e2e/cd-sections.e2e.ts | suite | secciones rt__ | vitest |
| test/e2e/cd-curriculum.e2e.ts | suite | curriculos | vitest |
| test/e2e/cd-mesh.e2e.ts | suite | malla / plan entries | vitest |
| test/e2e/cd-requirements.e2e.ts | suite | requisitos + linea de formacion | vitest |
| vitest.e2e.config.ts | config | descubrimiento + serie + timeouts del E2E | vitest |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| unit | npm test | 170 pass | 170 pass | 0 (los .e2e.ts no los toma npm test) |
| e2e | npm run test:e2e | (no existia) | 25 pass | +25 |

## Summary

Entregado: mecanica E2E del MCP lista y reutilizable (harness sobre el servidor real, auth Clerk test mode sin humano, verificacion por el path real, skip sin backend, teardown con 0 residuo), piloto + cobertura de toda la escritura de alto riesgo de curriculum-design (25 casos, 5 suites), gate obligatorio de E2E para tools de escritura/resolucion en el checklist de extension, documentacion doble (instruir + exigir), y auto-descubrimiento de reglas para IA (CLAUDE.md canonico + AGENTS.md que apunta a el, sin duplicar las docs). Plan vivo: `sp9/PLAN-mcp-testing-automatizado.md`. Deuda restante: (1) E2E en CI contra un up1 efimero (paso 1 hecho, local); (2) enforcement de las reglas via CI. Ambas coordinadas con el dueno del MCP.
