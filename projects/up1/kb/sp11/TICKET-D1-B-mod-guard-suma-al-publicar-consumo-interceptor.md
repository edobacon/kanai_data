---
id: DOC-kb-sp11-TICKET-D1-B-mod-guard-suma-al-publicar-consumo-interceptor
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp11
  - curriculum-mapping
  - UPONE-1770
  - D1
  - G-2
  - D4
  - guard-publicacion
  - draft-ticket
  - mod-only
---

# Ticket B (mod) - Guard de suma al publicar el plan + cierre de G-2/D4 (consumo del interceptor de core)

> **BORRADOR para revisión.** Ticket de mod (`curriculum-mapping`) del corte de dos tickets del D1. Consume el mecanismo del **Ticket A** (Core Extension - registry de interceptores). **Depende de A mergeado.** NO creado en Jira todavía. Veredicto de Aduana: **mod-only** (el conocimiento de la regla es de cm; el mecanismo genérico es lo que sale a core en el Ticket A).

## Ficha

- **Título:** Curriculum Mapping | Tributación | Guard de suma=100 al publicar el plan (D1)
- **Tipo:** Historia · **Épica:** UPONE-1452 (Curriculum Mapping)
- **Relación:** cierra el D1 que salió de **UPONE-1770**. **Bloqueado por** el Ticket A (Core Extension). No arranca hasta que A esté mergeado.
- **Story Points:** a estimar (chico; el guard reusa `assertPublishable`). Propuesta inicial: 3.
- **Sensibilidad:** Media.
- **Sprint:** follow-up.

## Historia de usuario

Como Diseñador Curricular, quiero que el sistema no me deje **publicar** un plan si algún grupo de pesos no suma 100 (salvo los grupos con modelo de medición `Max`, que quedan eximidos), para que un plan no llegue a Vigente con la tributación inconsistente.

## Contexto

- El requerimiento está en el propio 1770 (descripción y criterio de aceptación: "la suma se valida al publicar el plan"). Se sacó de la ejecución cm-interna de 149 porque el enforcement vive en la transición del `Curriculum` (dominio de curriculum-design) y hacerlo limpio pide el mecanismo del Ticket A.
- El precedente de la regla ya existe en el mod para **matrices**: `curriculum-mapping/logic/helpers/assertPublishable.js`, invocado en `logic/competencyMatrix-update.resolver.js` antes de delegar en el generic. Este ticket aplica el mismo patrón a la publicación del **plan**, pero a través del interceptor del core (no interceptando una mutación propia, porque el plan no es un objeto de cm).
- La transición a validar: `Approved -> Active` del `Curriculum` (`curriculum-design/objects/Curriculum.json:130`).
- El dato: `CompetencyAlignment` (de cm), agrupado por `(planId, competencyNodeId, developmentLevelId)`.

## Alcance (dentro, curriculum-mapping)

1. **Guard de publicación (D1).** Implementar `assertPlanWeightsBalanced`: dado un plan que pasa a `Active`, leer sus `CompetencyAlignment`, agrupar por `(planId, competencyNodeId, developmentLevelId)`, sumar `contributionPercentage` de las filas `Evaluates`/`Both` (R-6), y abortar con error personalizado si algún grupo no suma 100. Grupos cuya matriz tiene `courseAggregationMode = Max` quedan **eximidos**.
2. **Registro del interceptor.** En la carga del mod, registrar el guard vía el mecanismo del Ticket A: `object: 'Curriculum', op: 'update', when: { field: 'status', from: 'Approved', to: 'Active' }`.
3. **Cierre de G-2 (bypass del CRUD genérico).** Registrar los interceptores `create/update/delete` de cm que hoy no tienen dónde colgarse, para que la escritura del peso (y las demás reglas gobernadas) no se saltee por la vía genérica ni por `delete`. _Ver decisión de alcance abajo: puede ir en este ticket o en uno chico aparte._
4. **Cierre de D4 (paridad MCP del peso).** Con el guard corriendo server-side para toda puerta, quitar la regla duplicada en el contrato MCP del peso y ajustar el test de paridad (`contributionPercentage`). _Ver decisión de alcance abajo._

## Fuera

- El **mecanismo** de interceptores (Ticket A, core).
- Cualquier cambio en curriculum-design: **no se toca cd** (su override coexiste; el registro es aditivo). Es lo que evita el ciclo.
- La deuda de UI del selector de asignatura en la vista solo lectura (fix chico de front, se inclina a UPONE-1771; ajeno a este mecanismo).

## Criterios de aceptación (checkeables)

- [ ] Publicar un plan con todos los grupos medibles en 100 procede (pasa a Vigente).
- [ ] Publicar un plan con un grupo que no suma 100 se **rechaza** con error personalizado; el plan NO pasa a Vigente. (Bloqueo duro; **sujeto a confirmación de dureza con el PO**.)
- [ ] Un grupo cuya matriz tiene `courseAggregationMode = Max` queda eximido y no frena la publicación.
- [ ] Solo las filas `Evaluates`/`Both` participan de la suma (R-6); `Develops` no.
- [ ] El guard corre para **toda puerta** (UI, API, MCP), no solo la UI de cm.
- [ ] (G-2) La escritura del peso por la vía genérica y el `delete` quedan gobernados por el interceptor.
- [ ] (D4) El test de paridad MCP cubre `contributionPercentage` sin duplicar la regla.

## Definition of Done

- [ ] El guard vive en el resolver/helper gobernado del mod y se registra contra el mecanismo de core; ninguna vía de escritura del peso saltea las reglas.
- [ ] `sync`/`codegen` sin drift; artefactos de sync/seed no commiteados.
- [ ] El CRUD de tributación (1756) y el guardado en conjunto (149/1770) siguen verdes.

## Reglas de negocio a respetar

- **R-6:** solo `Evaluates`/`Both` producen evidencia de logro y participan del peso.
- **Exención `Max`:** grupos con `courseAggregationMode = Max` no validan suma.
- **Scope del grupo:** `(planId, competencyNodeId, developmentLevelId)`.

## Decisión de alcance del ticket (elegir)

Las tres deudas (D1 + G-2 + D4) se cierran consumiendo el mismo mecanismo, pero no tienen el mismo tamaño ni el mismo riesgo:

- **Opción 1 - un solo ticket B con las tres.** Coherente ("el mod adopta el registry"). Contra: mezcla el guard de negocio (D1) con migrar todo el CRUD genérico a interceptores (G-2, más ancho) y con la limpieza+test de MCP (D4). Riesgo de ticket abultado.
- **Opción 2 (recomendada) - ticket B acotado a D1**, y **G-2 y D4 como tickets chicos aparte** que consumen el mismo mecanismo. Más limpio de revisar y estimar; cada deuda cierra por separado.

## Referencias

- `curriculum-mapping/logic/helpers/assertPublishable.js`, `logic/competencyMatrix-update.resolver.js`.
- `curriculum-design/objects/Curriculum.json:130` (transición de publicación).
- `object-manager/prisma/UPU/schema.prisma:1095` (`model CompetencyAlignment`).
- Ticket A (Core Extension): `Ticket A (Core Extension) - Registry de interceptores de mutación pre-escritura en Object Manager` (sp11).
- Origen: `Pendiente cross-mod - Guard de suma al publicar el plan (D1, derivado de 1770)` (sp11), `UPONE-1770 - cierre de alcance y correcciones` (sp11).
