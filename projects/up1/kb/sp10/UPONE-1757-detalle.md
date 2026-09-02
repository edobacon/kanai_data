---
id: DOC-kb-sp10-UPONE-1757-detalle
project: up1
type: doc
module: mcp
tags:
  - sp10
  - mcp
  - curriculum-design
  - detalle
  - UPONE-1757
  - elric
  - diagnostico
  - endurecimiento-mcp
---

# UPONE-1757 Detalle (Curriculum Design MCP: diagnostico de reconciliacion Elric a MCP online)

> **Referencia externa:** UPONE-1757 · **Tipo:** explore (evaluacion/diagnostico + spike) · **Prioridad:** Mayor · **Epica:** UPONE-1267 (Curriculum Design) · **Asignado:** Eduardo Bacon · **Story Points:** 8
>
> Contrato del ticket (que conseguir). La guia de evaluacion y spike esta en `UPONE-1757-pre-intake`. La fuente de dominio (analisis Elric vs MCP y planes por capas) vive en sp9: `sp9/ANALISIS-backend-vs-client-cd-cm-endurecimiento-mcp.md`, `sp9/PLAN-integracion-elric-mcp-por-capas.md`, `sp9/PLAN-migracion-cd-cm-al-mcp-online.md`.

## Fuente canonica (PO)

La descripcion en Jira esta vacia. El alcance lo fija el titulo y el encuadre acordado:

> Curriculum Design | MCP | Diagnostico de reconciliacion a nueva arquitectura MCP.

Encuadre revisado: la restriccion del sprint permite diagnostico, no migracion. Este ticket evalua y diagnostica los casos de logica de negocio "hot" que hoy viven en el cliente (Elric / frontend) de Curriculum Design, hace un spike acotado del camino critico para bajar el riesgo de la migracion, y deja redactados los tickets de ajuste. La migracion real de codigo productivo queda como follow-up, fuera de este ticket.

## Historia de usuario

Como equipo de plataforma/dev, quiero evaluar la logica de negocio del modulo Curriculum Design que hoy vive solo en el cliente y no tiene equivalente server-side, validar con un spike el camino de migracion mas riesgoso, y dejar redactados los tickets de ajuste correspondientes, para llegar al proximo sprint con el riesgo bajado y el trabajo de migracion listo para priorizar.

## Objetivo

Evaluar (diagnosticar) que logica de negocio hot vive hoy en el cliente de Curriculum Design y decidir el camino de cada caso (A escalar al resolver del mod, B ficha/`registerExtra` en el MCP con `blockGenericMutation`, C queda client-side por UX). Hacer un spike acotado que valide el camino critico identificado. Dejar escritos los tickets de ajuste (la migracion real) con su alcance. No se migra codigo productivo en este ticket.

## Contexto (para dimensionar)

- **Es evaluacion + spike, no ajuste.** El sprint restringe a diagnostico; la migracion real se redacta como tickets de ajuste para ejecutar despues, no se implementa aca.
- **Arquitectura MCP online (declarativa):** la tool de mod es una "ficha" (datos) en `mods/<mod>/ai/`; el motor generico (`mcp/src/tools/register-declarative-tools.js`) la vuelve tool real. Hay un escape hatch `registerExtra(server, ctx)` para custom-logic (sagas, upserts, tree-ops), con aislamiento estricto (nada en `ai/` importa fuera de esa carpeta).
- **Estado real de la cobertura MCP de cd:** `mods/curriculum-design/ai/` ya tiene un ModPack con **4 fichas** (`cd_validate_activity_evaluations`, `cd_create_formtemplate_for_activity`, `cd_add_plan_entries_batch`, `cd_remove_plan_entries_batch`), sin `registerExtra` ni bloqueo del generico. `notExposed` deja fuera a proposito: curriculos, malla (salvo el batch de planEntry), bibliografia, programas academicos, silabos, cadena de versiones.
- **Endurecimiento (`blockGenericMutation`):** el motor generico expone `up1_create/update/delete_object`, que sobre un objeto gobernado (override o resolver `*Validated`) puede saltear sus reglas. Ese mecanismo **hoy no existe** en el repo `mcp` (verificado). Es bloqueante de seguridad transversal a cd y cm, compartido con UPONE-1758; su implementacion real es de ajuste, no de este ticket.
- **Correcciones de frescura al analisis de sp9:** (1) el bloqueante B2 (OAuth de `object-manager`) que sp9 daba como "sin pushear" **ya esta mergeado a develop** (`1ed7c22b`, PR #507); no es riesgo activo. (2) `requiresComment` sigue declarado y **no enforzado** en `enforceEnumTransitions` (confirmado en `activity.resolver.js:29`); es Core Extension, queda Fuera.
- **Frescura:** `mcp@30a032a` (mergeado a develop), `curriculum-design@8a151e7`; el analisis de sp9 sigue vigente para cd.

## Alcance

**Dentro:**

1. **Evaluacion/clasificacion de todos los casos** listados en `## Casos a explorar`, con rutas `file:line` y camino confirmado (A/B/C).
2. **Spike acotado del camino critico**: validar en runtime un camino-A de mayor riesgo (por ejemplo escalar una regla de malla al resolver), para confirmar factibilidad y bajar el riesgo antes de comprometer la migracion real. El spike de este ticket es sobre un camino-A (mod-direct); `blockGenericMutation` (camino B, motor MCP) no se spikea aca, se valida en su propio follow-up.
3. **Redaccion de los tickets de ajuste** (camino A y camino B) con su alcance, listos para priorizar en un sprint posterior.

**Fuera:**

- La migracion real de las reglas (queda en los tickets de ajuste que este ticket produce).
- `blockGenericMutation` (fichas / `registerExtra` del repo `mcp`): camino B, pasa por validador del MCP: follow-up. Se evalua el caso (ver `## Casos a explorar`), pero su spike e implementacion no son de este ticket.
- Los Core Extensions (`requiresComment` en `enforceEnumTransitions`, enforcement de enum `RecordType`): se identifican y coordinan con core, no se resuelven ni se redactan como tickets de ajuste de mod.
- El "future pass" (curriculos, programas, bibliografia, silabos) que el propio `notExposed` del pack deja fuera: queda pospuesto con motivo.

## Caminos de reconciliacion (A/B/C)

Cada caso se clasifica por el camino que se propone para resolverlo. La columna "Camino hipotesis a confirmar" de la tabla de abajo es una **propuesta del analisis**: la evaluacion de este ticket la confirma o la corrige caso por caso contra el codigo. El criterio por defecto es **escalar al servicio** (regla del proyecto `RULE-server-side-logic-mcp-ready`); solo se aparta cuando el caso lo justifica.

- **A. Escalar al resolver (server-side).** La regla se mueve al resolver gobernado del mod (mutations `*Validated`). Se elige cuando es un **invariante de negocio** que debe valer por cualquier via (UI, API, MCP), no solo en el cliente. Es el camino preferido.
- **B. Ficha / `registerExtra` en el MCP, o `blockGenericMutation`.** Se elige cuando (1) hay que exponer la capacidad por el MCP y no es un simple upsert (saga, tree-op, custom-logic): va como ficha declarativa o `registerExtra`; o (2) un objeto ya gobernado queda expuesto a escritura por el generico y hay que **endurecerlo** con `blockGenericMutation` para que no salte sus reglas.
- **C. Queda client-side.** Se elige cuando la regla es **presentacion o UX pura**, no un invariante de negocio (ej. decimales de despliegue, reparto de pesos en partes iguales). Mover al servidor no aporta: no hay nada que otra via pueda violar.

**Desempate A vs C:** gana A si la regla, saltada, corrompe datos o deja el modelo inconsistente; gana C solo si su unico efecto es de interfaz. B no compite con A: es el "como" cuando A necesita ademas exponerse por MCP, o cuando hay que tapar el bypass del generico.

**Regla de alcance (mod vs MCP):** entra en el alcance ejecutable directo lo que se resuelve **en el mod** (camino A: escalar la regla al resolver del mod). Lo que **pasa por un validador del MCP** (camino B: `blockGenericMutation` y las fichas / `registerExtra` del repo `mcp`) **corresponde a follow-up**, no a este ticket: toca el mecanismo compartido del motor MCP y se coordina aparte. El camino C (UX pura) no se migra.

## Entregable: veredicto de blockGenericMutation

Este ticket debe **cerrar con un veredicto** sobre la necesidad y la urgencia de bloquear el update generico del MCP (`blockGenericMutation`) para los objetos gobernados que evalua. Es el insumo que decide si el follow-up de camino B se crea o no.

- **Necesidad.** Se decide por donde queda el invariante tras el ajuste de camino A: si se escala al **override de create/update del objeto (N3)**, el generico ejecuta la misma regla y el bloqueo es **innecesario**; si el invariante queda en una mutation `*Validated` **paralela** que el generico puede esquivar **(N1)**, el bloqueo es **necesario**.
- **Urgencia.** Se decide por el riesgo del acceso generico **abierto hoy**: si el objeto gobernado ya esta expuesto a escritura por el generico/MCP y una escritura que salta la regla corrompe datos, es **alta**; si el objeto aun no se expone por MCP, es **baja** (se resuelve antes de exponerlo); **media** si esta expuesto pero el dano es acotado o reversible.

**Consecuencia:** el follow-up de `blockGenericMutation` (camino B) **solo procede si el veredicto lo declara necesario** (N1). Si el veredicto es N3, ese bloqueo no se crea, salvo como defensa en profundidad o por politica de exposicion.

## Casos a explorar

| Caso | Donde | Camino hipotesis a confirmar |
|---|---|---|
| Reglas de malla (planEntry), hoy en el cliente | | |
| 1. Editar solo con plan en Draft | `curriculumMesh.logic.ts` | A |
| 2. Unicidad (planId, activityId) | `curriculumMesh.logic.ts` | A |
| 3. Impacto de borrado (allow/cascade/block) | `deletionImpact.logic.ts` | A |
| 4. Pre-check de prerrequisitos | `prereqCheck.logic.ts` | A |
| 5. Escaneo de prereqs en la malla | `meshPrereqScan.logic.ts` | A |
| 6. Derivacion de nivel modular | `deriveLevel.logic.ts` | A |
| 7. Recalculo period/position | `recalcPeriodPosition.logic.ts` | A |
| 8. Alta guiada | `guidedAdd.logic.ts` | A/C (evaluar) |
| 9. Forma de entrada (modal) | `editEntryModal.logic.ts` | C/A (evaluar) |
| 10. Bloque electivo | `blockSelect.logic.ts` | A/C |
| 11. Sanitizacion de HTML (CustomSection, seguridad/XSS) | `RichTextRenderer/sanitizeHtml.ts` | A |
| Escrituras custom-logic (Elric) sin cobertura online | | |
| 12. Version chains | Elric | B (registerExtra) |
| 13. Transiciones de estado (statusFlow) | Elric | A/B |
| 14. Sagas con rollback (cd_add_plan_entry) | Elric | B |
| 15. Tree-ops de requisitos (cd_manage_requirement) | Elric | B |
| 16. Upsert de perfil de egreso | Elric | B |
| 17. Clonados | Elric | B |
| Brechas parciales y plataforma | | |
| 18. R0 progression esquivable por path rt | resolver cd | A (fix) |
| 19. R1 RBAC en createSyllabusOffering | resolver cd | A (fix) |
| 20. blockGenericMutation (mecanismo, repo mcp; compartido con 1758) | mcp | endurecimiento |
| 21. requiresComment enforcement | object-manager | Core Extension (coordinacion core) |
| 22. enum RecordType enforcement | object-manager | Core Extension |

## Criterios de aceptacion (checkeables)

- [ ] Cada uno de los 22 casos de `## Casos a explorar` queda clasificado A/B/C, con su fuente (`file:line`) confirmada en el codigo.
- [ ] El spike del camino critico esta concluido, con su hallazgo documentado (funciona / no funciona / con que ajuste).
- [ ] Los tickets de ajuste (camino A y camino B) estan redactados con su alcance, listos para cargar en Jira.
- [ ] R0 y R1 quedan confirmados como fix puntual sobre codigo ya server-side del mod, sin necesidad de aplicarse en este ticket.
- [ ] Los Core Extensions (`requiresComment`, enum `RecordType`) quedan identificados y explicitamente Fuera, con su ubicacion para coordinar con core.
- [ ] El ticket entrega, por objeto gobernado evaluado, el **veredicto de `blockGenericMutation`**: necesidad (N1 necesaria / N3 innecesaria, segun donde quede el invariante) y urgencia (alta / media / baja con su motivo).

## Definition of Done (checkeable)

Aplica el estandar DoR/DoD del equipo. Ademas:

- [ ] Evidencia del spike (resultado de la prueba runtime, no solo lectura de codigo).
- [ ] El criterio MCP-ready (`RULE-server-side-logic-mcp-ready`) se mantiene como recomendacion por caso en la evaluacion, para escalar cada regla al servicio en su ticket de ajuste.
- [ ] El hallazgo de seguridad de sanitizacion de HTML de `CustomSection` (XSS por API si se expone sin backend) queda registrado en la evaluacion, aunque su ajuste sea un ticket aparte.
- [ ] Doc de evaluacion + spike + tickets de ajuste registrado y referenciado desde el ticket.

## Tests minimos / verificacion (checkeables)

- [ ] Para el caso spikeado: prueba runtime que confirma (o descarta) el camino hipotesis.
- [ ] Para el resto de los 22 casos: la clasificacion A/B/C se confirma leyendo el resolver o el pack `ai/` correspondiente (no queda en hipotesis sin verificar).
- [ ] R0 y R1: se confirma en el codigo que el bypass/la brecha existe hoy (sin corregirla en este ticket).

## Factores transversales (checkeables)

- [ ] Seguridad: **aplica.** El spike, `blockGenericMutation` y la sanitizacion de HTML son de seguridad; se documentan como hallazgo aunque no se ajusten aca.
- [ ] Documentacion: **aplica** (la evaluacion, el spike y los tickets de ajuste quedan documentados).
- [ ] Capa de lenguaje / accesibilidad / Storybook / tokens: N/A (evaluacion y spike, sin UI nueva).
- [ ] Convenciones de mod: aplica a la evaluacion de los casos B (aislamiento de `ai/`, escritura gobernada). Ver Guia.
- [ ] **Logica server-side / MCP-ready (regla del proyecto, get_rules):** es el criterio con el que se evalua cada caso; su aplicacion real queda en los tickets de ajuste.

## Frontera core/mod (Aduana)

Pasada de Aduana en subagente de contexto limpio, modo analisis, contra el working copy real.

| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| Reglas de malla (casos 1-11) | `mod` (resolver de cd) | Invariante de objeto propio de cd; camino A | analisis sp9, tickets A-CD-1..3 |
| Sagas / tree-ops via `registerExtra` (casos 12-17) | `mod` (via `registerExtra` en `mods/curriculum-design/ai/`) | Patron ya probado en `academic-scheduling/ai/rule-value-upsert.js`; no es del motor MCP | PLAN-migracion sp9, seccion 2.4.5 / 7-B4 |
| `blockGenericMutation` como mecanismo (caso 20) | `repo mcp` (motor generico) | Infraestructura transversal del contract registry, reutilizable por todo mod; compartido con UPONE-1758 | PLAN-migracion sp9, seccion 2.4.6 / 7-B3 |
| Enforcement de `requiresComment` (caso 21) | `core` (object-manager), via Core Extension | Hoy es metadata que solo lee el MCP; para valer tambien por UI y otro cliente debe vivir en el motor de transiciones del core | analisis sp9 A-CORE-1; Fuera de esta base |
| Enforcement de enum `RecordType` (caso 22) | `core` (object-manager), via Core Extension | Backlog de plataforma, no especifico de cd | analisis sp9 A-CORE-2; Fuera de esta base |
| R0 y R1 (casos 18-19) | `mod` (resolver existente de cd) | Fixes puntuales sobre codigo ya server-side del mod | analisis sp9 seccion 4.1 |

**Veredicto global:** la mayor parte de la migracion futura es del mod (resolver + pack `ai/`). `blockGenericMutation` es del repo `mcp` (motor generico, endurecimiento). `requiresComment` y el enum de `RecordType` son Core Extension y quedan Fuera de este ticket.

## Dependencias

- **Comparte con UPONE-1758** el mecanismo `blockGenericMutation` (no se implementa dos veces; coordinar cual de los dos tickets de ajuste lo ejecuta).
- **Depende (para lo que quede en tickets de ajuste, no para esta evaluacion) de:** los Core Extension de `requiresComment` y enum `RecordType`.
- **Frescura resuelta:** B2 (OAuth de object-manager) ya mergeado; no es dependencia activa.

## Estimacion (calibrada)

**8 SP (explore).**

- Evaluacion/clasificacion de los casos (~4): inventariar y confirmar file:line de los 22 casos.
- Spike del camino critico (~2): prueba runtime acotada de un camino-A (mod-direct); `blockGenericMutation` (camino B, motor MCP) se valida en su propio follow-up.
- Redaccion de los tickets de ajuste (~2): tickets de camino A y B con su alcance.

**Esfuerzo:** Considerable · **Sensibilidad:** Baja.

## Decisiones abiertas

- [ ] **Que camino-A spikear**: escalar una regla de malla al resolver (ej. impacto de borrado). `blockGenericMutation` (camino B, motor MCP) no se spikea en este ticket, queda para su propio follow-up.
- [ ] **Alcance del "future pass"** (curriculos, programas, bibliografia, silabos): confirmar que sigue pospuesto o si algun caso entra en esta evaluacion.
- [ ] **Prioridad de los tickets de ajuste** resultantes, frente al resto del backlog de plataforma.

## Guia de ejecucion: reglas y patrones up1 a considerar

- **[A favor]** `registerExtra` para custom-logic que no entra en una ficha; aislamiento estricto de `ai/`. _Fuente: `mods/academic-scheduling/ai/rule-value-upsert.js`._
- **[Gate]** El endurecimiento `blockGenericMutation` es prerrequisito de seguridad para exponer cualquier objeto gobernado a escritura por MCP; es camino B (pasa por validador del MCP), no se spikea en este ticket, se spikea y se implementa en su propio follow-up. _Fuente: analisis sp9, B3._
- **[Advertencia]** La sanitizacion de HTML de `CustomSection` es de seguridad (XSS por API si se expone sin sanitizacion server-side); queda registrada en la evaluacion aunque su ajuste sea un ticket aparte.
- **Transversal:** el online "gana" en cualquier empate de diseno contra Elric; migrar es reexpresar como ficha o `registerExtra`, no portar codigo.

## Tickets relacionados

| Ticket | Que es | Relacion | Estado |
|---|---|---|---|
| UPONE-1267 | Epic Curriculum Design | contenedor | Backlog |
| UPONE-1758 | Curriculum Mapping MCP: evaluacion + ajuste | hermano: comparte la arquitectura MCP online y el mecanismo `blockGenericMutation` | Backlog |
| UPONE-1530 | Curriculum Mapping MCP sync | antecedente: dejo el patron declarativo de fichas y el read-only de cm | Finalizada |

## Referencias

- Fuente de dominio: `sp9/ANALISIS-backend-vs-client-cd-cm-endurecimiento-mcp.md`, `sp9/PLAN-integracion-elric-mcp-por-capas.md`, `sp9/PLAN-migracion-cd-cm-al-mcp-online.md`.
- Regla del proyecto: `RULE-server-side-logic-mcp-ready`.
- Guia de evaluacion y spike: `UPONE-1757-pre-intake` (este sprint).
- Working copy verificado: `mcp@30a032a`, `curriculum-design@8a151e7`.
