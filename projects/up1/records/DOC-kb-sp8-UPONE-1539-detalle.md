---
id: DOC-kb-sp8-UPONE-1539-detalle
project: up1
type: doc
---

# UPONE-1539 - Configuracion de malla para un plan de estudio modular

> Historia · Prioridad Mayor · Epic UPONE-1267 Curriculum Design · Asignado: Eduardo Bacon
> Enlace: https://u-planner.atlassian.net/browse/UPONE-1539

## Fuente canonica (PO)

> Extender la funcionalidad de malla curricular para soportar el diseno de planes modulares de acuerdo con el diseno de la maqueta adjunta, en donde lo principal es:
> - Las columnas de "Nivel" se dibujan en base a las restricciones de requisitos de las asignaturas que se anaden a la malla.

## Historia de usuario

Como **Disenador Curricular**, quiero armar la malla de un plan modular donde el orden de las asignaturas surge de sus prerrequisitos (sin periodos fijos), para soportar carreras cuya progresion depende de la inscripcion del estudiante y no de semestres.

## Objetivo

Cuando el plan es Modular, la malla organiza las asignaturas en niveles derivados de los requisitos: una asignatura sin prerrequisitos presentes queda en el primer nivel; una con prerrequisitos presentes queda un nivel por encima del mas profundo de ellos; el nivel se recalcula automaticamente al agregar o quitar. Cuando el plan es Secuencial, la malla sigue por periodos como hoy. El flujo de agregado con prerrequisitos faltantes queda consistente al volver atras sin completar.

## Contexto (para dimensionar)

Es una feature apoyada en trabajo existente: la logica de prerrequisitos (arbol Y/O, evaluacion de satisfaccion) se construyo en SP7 y se reusa; lo nuevo es derivar el nivel a partir de esos requisitos y dibujar la malla por niveles ademas de por periodos. El componente de malla es un elemento Vueform custom del mod, que hoy solo dibuja por periodos. La maqueta (`mockup_v10`) define el comportamiento objetivo del modo modular: banner de plan no-secuencial, niveles que se recalculan solos, y modal de bloqueo al agregar una asignatura con prerrequisitos faltantes. El caso viene diferido (acotado fuera en SP5 como BL-6, difierido en SP6, en SP7 se hizo el editor de requisitos pero no el render modular) y hereda una deuda del modelo (el elemento de malla hoy exige periodo, pensado para planes secuenciales). El detalle tecnico esta en el pre-intake.

## Alcance

**Dentro:** la malla distingue plan Secuencial (columnas = periodos) de Modular (columnas = niveles derivados de requisitos); derivacion automatica del nivel con manejo de dependencias circulares; homologacion del flujo de agregado con prerrequisitos faltantes.

**Fuera:** la configuracion del formulario del plan (UPONE-1538); el motor de evaluacion del avance del estudiante. El cambio de modelo de `planEntry` (period nullable en modular) queda sujeto a decision (ver Decisiones abiertas), no se asume dentro por defecto.

## Criterios de aceptacion (checkeables)

- [ ] Plan Modular: las columnas representan niveles (profundidad de dependencias), no semestres.
- [ ] Asignatura sin prerrequisitos presentes -> aparece en el primer nivel.
- [ ] Asignatura con prerrequisitos presentes -> nivel = uno por encima del mas profundo de esos prerrequisitos.
- [ ] El nivel se recalcula solo al agregar o quitar asignaturas (no se asigna a mano).
- [ ] Ciclo de prerrequisitos entre asignaturas del plan -> el calculo no se cuelga y el caso se reporta.
- [ ] Plan Secuencial: la malla sigue organizando por periodos (sin regresion).
- [ ] Flujo de agregado con prerrequisitos faltantes: al volver atras sin completar, no queda la asignatura ni sus prerrequisitos a medio agregar.

## Definition of Done (checkeable)

> Aplica el estandar DoR/DoD del equipo (`sp8/estandar-DoR-DoD.md`). Ademas, especifico de este ticket:

- [ ] Malla modular por niveles y secuencial por periodos verificadas en el componente real con un plan modular de prueba (evidencia runtime).
- [ ] Calculo de nivel correcto con y sin prerrequisitos y estable ante ciclos (con casos de prueba).
- [ ] Flujo de agregado deja la malla en estado consistente al cancelar/volver.
- [ ] Sin regresion en planes secuenciales.
- [ ] Artefactos de sync/seed no commiteados.

## Tests minimos (checkeables; ampliables en ejecucion)

> Conjunto minimo a cubrir. El dev puede y debe sumar mas casos durante la ejecucion si surgen.

- [ ] Plan modular, asignatura sin prereqs -> nivel 1.
- [ ] Plan modular, asignatura con prereqs presentes -> nivel = 1 + nivel maximo de sus prereqs presentes.
- [ ] Plan modular con ciclo de prereqs -> no se cuelga; reporta el caso.
- [ ] Prereqs con contenedores estructurales (grupos Y/O) o un grupo vacio -> no distorsionan el nivel calculado (los contenedores no cuentan como prerrequisito-curso).
- [ ] Plan secuencial -> sigue por periodos (sin regresion).
- [ ] Agregar con prereqs faltantes y volver atras -> no queda nada a medio agregar.

## Factores transversales (checkeables)

- [ ] Permisos (RBAC): N/A - opera dentro del Curriculum ya gateado; no agrega capabilities nuevas.
- [ ] Historial / auditoria (DataLog): N/A - no hay objeto nuevo; el nivel es derivado en runtime, no se persiste.
- [ ] Capa de lenguaje (i18n): aplica - nuevos textos (rotulo "Nivel N" del encabezado de columna y mensajes del flujo de agregado) en es/en/pt con paridad de keys.
- [ ] Accesibilidad (WCAG): aplica - la malla es interactiva (foco, navegacion por teclado); mantener WCAG AA en la vista modular.
- [ ] Storybook: aplica - actualizar/agregar el estado modular del componente de malla en su story.
- [ ] Design tokens (`var(--up1-*)`, sin hardcode): aplica - la UI por niveles usa tokens, sin valores hardcodeados.
- [ ] Convenciones de mod: aplica - logica de derivacion de nivel en `.ts` puros (separacion), sync tras cambios, tenant isolation en las queries de la malla, no commitear artefactos de sync.
- [ ] Documentacion: aplica - documentar el modo modular de la malla en la guia del mod.

## Dependencias

Consume el tipo de progresion del Plan (mismo dato que UPONE-1538). Reusa la logica de prerrequisitos del SP7. UPONE-1450 (versionamiento del Plan, Finalizada) ya toco el mismo objeto `Curriculum`; revisar su cambio para no chocar.

## Estimacion

**8 SP.** Feature con derivacion de nivel (grafo + ciclos), distincion de modo en el render y homologacion del flujo de agregado, sobre la base reusable del SP7.
Sube a **13 SP** si entran las decisiones que tocan modelo/comportamiento (period nullable en modular y rediseno del drag&drop). Cerrar esas decisiones antes de comprometer el numero final.

## Decisiones abiertas

- [ ] Reordenar en modular: solo lectura del orden (recomendado, lo dicta el grafo) vs mantener algun reordenamiento con otra semantica.
- [ ] Periodo en modular: dejar de exigir el dato de periodo en modular vs conservarlo ignorado usando solo el nivel derivado. (Esta decision mueve la estimacion de 8 a 13 SP.)
- [ ] Control de agregar/quitar periodo en modular: definir si se oculta.

## Guia de ejecucion: reglas y patrones up1 a considerar

> No dice como implementar; marca reglas/patrones (a favor) y antipatrones (evitar) de up1 que aplican a este ticket.

- **[A favor]** Reusar el evaluador fiel del arbol de prerrequisitos y el recalculador de posicion ya existentes en el mod; no reimplementarlos. _Fuente: `mods/curriculum-design/docs/architecture/curriculum-mesh-guards-prereqs.md` y `modsComponents/CurriculumMesh/evaluateRequirementTree.logic.ts`._
- **[Evitar]** La evaluacion de requisitos debe ser fiel al arbol Y/O: prohibido aplanarlo a una lista AND global o mirar solo los hijos directos de un grupo. _Fuente: `modsComponents/CurriculumMesh/evaluateRequirementTree.logic.ts` (+ el doc de arquitectura)._
- **[Evitar]** Grupos/pools vacios: un grupo sin hojas se evalua como falso-satisfecho; la derivacion de nivel debe excluirlos. _Fuente: `modsComponents/CurriculumMesh/*.logic.ts` y seed `_data-requirement.js`._
- **[Advertencia]** La convencion de `position` esta bifurcada (la malla es 0-based; `CompositeSectionTree` es 1-based). Al tocar drag&drop no mezclar convenciones sin normalizar. _Fuente: `modsComponents/CurriculumMesh/*` vs `layout/src/modsComponents/CompositeSectionTree/*`._
- **[A favor]** Patron de componente del mod: Vueform element + Apollo por tenant + sortablejs + modales caseros, con la logica en `.ts` puros testeables. No usar el gestor de modales global dentro de un Vueform element (no se expone a Vueform elements). _Fuente: precedente `layout/src/modsComponents/CompositeSectionTree/`; componentes existentes de `CurriculumMesh`._
- **[Evitar]** No crear carpetas solo-logica sin componente-entry: el sync no las propaga y rompe en runtime. _Fuente: `object-manager/scripts/sync` (propagacion de `modsComponents/`)._
- **[Advertencia]** La malla es un Vueform siempre montado (`v-show`, sin keep-alive): refrescar tras editar es refetch manual, no por ciclo de vida (`onActivated` no aplica). _Fuente: `modsComponents/CurriculumMesh/CurriculumMeshElement.vue`._
- **[Advertencia]** `defineElement` (Vueform) es Options API: no invocar Composition APIs (`ref`, `computed`, `onMounted`) dentro de un computed getter. _Fuente: precedente `ActivityStatusBadgeElement.vue`; docs de Vueform `defineElement`._
- **Transversal:** tenant isolation en toda query (el client por tenant no lleva `tenantId`); correr sync; no editar archivos sincronizados a mano; en codigo/commits/PR usar solo el id Jira. _Fuente: `object-manager/src/graphql/resolvers/`; `up1/CLAUDE.md` (Multi-Tenant, Critical Rules)._

## Tickets relacionados

| Ticket | Que es | Relacion | Estado |
|---|---|---|---|
| UPONE-1267 | Epic Curriculum Design | contenedor | Backlog |
| UPONE-1538 | Config de plan modular | hermano SP8, define el dato `progression` que la malla lee | Backlog |
| UPONE-1378 | Requisitos de asignatura (editor Y/O) | se reusa su logica de prerrequisitos para derivar el nivel | Finalizada |
| UPONE-1348 | Malla: ver, modo edicion y resumen | el componente de malla base que este ticket extiende | Finalizada |
| UPONE-1345 | Objetos planEntry + requirementCategory | modelo `planEntry` (de aqui viene la deuda de `period` nullable) | Finalizada |
| UPONE-1450 | Versionamiento de plan de estudio | ya toco el mismo objeto `Curriculum` | Finalizada |

## Referencias

- Fuente canonica: UPONE-1539 (+ maqueta `mockup_v10.html`).
- Planning SP8: `sp8/transcript-planning-2026-08-04.md` (malla modular).
- Antecedente diferido: `sp5/SP6-backlog-diferidos.md` (S7-05), `sp7/README.md` (malla modular en diseno, sin ticket).
