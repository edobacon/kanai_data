---
id: DOC-kb-sp8-UPONE-1537-detalle
project: up1
type: doc
---

# UPONE-1537 - Curriculum Mapping | Matrices de competencia | Datos generales

> Historia · Prioridad Mayor · Epic UPONE-1452 Curriculum Mapping · Asignado: Francisco Navarro · Story Points en Jira: sin asignar
> Enlace: https://u-planner.atlassian.net/browse/UPONE-1537

## Fuente canonica (PO)

> Implementar el objeto de `competencyNode` con el recordType de `Matrix`, el mantenedor de competencias con la capacidad de creacion restringida solo a los datos generales sin considerar Facultad y Planes de estudio.

## Historia de usuario

Como **Disenador Curricular**, quiero crear una matriz de competencia capturando solo sus datos generales (nombre, codigo, tipo, escala de nivel y politicas), sin asociar todavia Facultad ni Planes de estudio, para configurar la matriz en un primer paso antes de construir sus competencias, la rubrica y la tributacion.

## Objetivo

Un mantenedor de matrices que permita crear una matriz con sus datos generales (nombre, codigo, descripcion, tipo de matriz, escala de nivel, politica de rubrica y politica de agregacion), naciendo en estado borrador, sin pedir Facultad ni Planes de estudio, y listar/ver el detalle de datos generales.

## Contexto (para dimensionar)

Es el primer paso de un proceso de dos: (1) crear la matriz con sus datos generales (este ticket), (2) asociarle los planes de estudio (posterior). Se parte en dos porque hacerlo en un solo guardado con multiples pasos arrastraba problemas de hidratacion y relaciones colgando heredados del legacy. La matriz no existe hoy; estuvo en diseno durante SP7 sin ticket. Depende de la escala de nivel, ya construida. La asociacion a Planes es una relacion aparte (fase de tributacion) y la Facultad no es un dato propio de la matriz, por eso ambos quedan fuera. "Considerar solo los cuatro niveles generales sin el aporte base" (acordado en la reunion) significa diferir la logica de agregacion/ponderacion, que sigue en refinamiento. El motor de estados por enum que usaria el ciclo de vida ya existe en la plataforma. Nota: el tipo de matriz tiene una diferencia de valores entre la propuesta y la maqueta que hay que cerrar.

## Alcance

**Dentro:** el objeto de matriz con sus datos generales; el mantenedor (listar, crear, ver, editar datos generales); la eleccion de la escala de nivel; el estado inicial borrador; los permisos del mantenedor.

**Fuera:** el arbol de competencias y subcompetencias; la rubrica y el modo de evaluacion; la asociacion a Planes (paso 2) y a Facultad; la logica de agregacion/ponderacion ("aporte base") y el motor de calculo; el ciclo de vida completo de estados (ver decisiones abiertas).

## Criterios de aceptacion (checkeables)

- [ ] Se puede crear una matriz en estado borrador con sus datos generales, eligiendo una escala de nivel existente.
- [ ] La creacion no ofrece asociar Facultad ni Planes de estudio.
- [ ] La escala de nivel es obligatoria.
- [ ] El codigo de la matriz es unico.
- [ ] Se puede listar las matrices y abrir el detalle de datos generales.

## Definition of Done (checkeable)

> Aplica el estandar DoR/DoD del equipo (`sp8/estandar-DoR-DoD.md`). Ademas, especifico de este ticket:

- [ ] Crear una matriz con datos generales verificado en el tenant UPU (evidencia runtime), en borrador y con una escala de nivel valida.
- [ ] La creacion no expone Facultad ni Planes.
- [ ] Permisos del mantenedor (ver/crear/modificar/eliminar) efectivos para los roles curriculares.
- [ ] Al abrir la creacion sin editar y volver, no pregunta por cambios sin guardar.
- [ ] Artefactos de sync/seed no commiteados.

## Tests minimos (checkeables; ampliables en ejecucion)

> Conjunto minimo a cubrir. El dev puede y debe sumar mas casos durante la ejecucion si surgen.

- [ ] Crear matriz con datos generales + escala de nivel -> guarda en borrador y aparece en el listado.
- [ ] Crear matriz sin escala de nivel -> rechaza (obligatoria).
- [ ] Abrir la creacion de matriz -> no aparecen Facultad ni Planes.
- [ ] Dos matrices con el mismo codigo -> rechaza (codigo unico).
- [ ] Ver el detalle de una matriz -> muestra solo datos generales.

## Factores transversales (checkeables)

- [ ] Permisos (RBAC): aplica - declarar caps `competencynode:view/create/modify/delete` y cablearlas a los roles curriculares existentes (no crear roles nuevos). El cableado del `_data-rbac.js` del mod es Decision abierta.
- [ ] Historial / auditoria (DataLog): decision - definir si la matriz lleva historial. Precedente inmediato (levelScheme/coverageScheme): `enableDataLog:false` + historial consolidado a mano por guardado; seguir ese patron salvo razon en contra. Ojo: si usa el path RT-projected, la atribucion `ownerType/ownerId` del DataLog tiene un gap conocido.
- [ ] Capa de lenguaje (i18n): aplica - labels del objeto y del RecordType Matrix, y los valores de enum (tipo de matriz, estado) en es/en/pt con paridad de keys.
- [ ] Accesibilidad (WCAG): aplica - mantenedor y formulario de datos generales accesibles (WCAG AA).
- [ ] Storybook: aplica - story del mantenedor de matrices (si incorpora componente nuevo).
- [ ] Design tokens (`var(--up1-*)`, sin hardcode): aplica.
- [ ] Convenciones de mod: aplica - schema-driven (codegen + migrate), identidad `rt__Matrix__competencynode`, FK escalar a levelScheme (no relacion Prisma), escritura gobernada si hay validacion de negocio, seed + cleanup, sync sin commitear artefactos, tenant isolation.
- [ ] Documentacion: aplica - referencia del objeto y del mantenedor.

## Dependencias

Requiere la escala de nivel (ya construida). Habilita el paso 2 (asociacion de planes) y los tickets del arbol de competencias y la rubrica.

## Estimacion

**5 SP.** Recorte de datos generales de la matriz, no la matriz completa: excluye el arbol de competencias, la rubrica y la tributacion, que son lo mas pesado. Reusa el patron de mantenedor ya probado en el mod. Sube a **8 SP** si se incluye aqui el ciclo de vida de estados completo o si hay que dejar cableados los permisos del mod desde cero.

## Decisiones abiertas

- [ ] Alcance del estado en este ticket: solo el estado inicial borrador, o el ciclo de vida de transiciones completo. Nota: el motor de transiciones por enum ya existe en la plataforma (el mismo que usan Curriculum/Activity/Offering); declarar transiciones adicionales (ej. -> InReview) es configuracion declarativa con capability por arista, no construir un motor, lo que abarata la opcion "ciclo completo aqui".
- [ ] Cerrar la lista de valores del tipo de matriz (hay diferencia entre la propuesta y la maqueta).
- [ ] Cablear los permisos del mod a los roles ahora o diferir.

## Guia de ejecucion: reglas y patrones up1 a considerar

> No dice como implementar; marca reglas/patrones (a favor) y antipatrones (evitar) de up1 que aplican a este ticket.

- **[A favor]** El estado de la matriz va por el motor de estados por enum de core (bloque de transiciones declarado en el objeto), igual que Activity/Curriculum. _Fuente: `mods/curriculum-design/objects/activity.json` (bloque `status`/`transitions`); `object-manager/src/graphql/resolvers/instance.resolver.js` (`enforceEnumTransitions`); Jira UPONE-1381._
- **[Evitar]** No reintroducir un workflow relacional (objetos Workflow/WorkflowStatus) para el estado: se retiro del mod tras migrar al enum de core. _Fuente: Jira UPONE-1459 (retiro de los objetos workflow)._
- **[A favor]** La FK a la escala de nivel es FK simple; en modelos RT las FK son IDs escalares (no relaciones Prisma, no en `include`). Tipo de columna segun el namespace del target (business -> `String`). _Fuente: `up1/CLAUDE.md` (RecordType Conventions); `object-manager/scripts/codegen/generatePrismaSchema.js:197`._
- **[A favor]** Identidad canonica `rt__Matrix__competencynode` como clave real; el titulo humano no es clave. _Fuente: `object-manager/scripts/detect-schema-drift.js`; ejemplo `mods/curriculum-design/objects/RecordTypes/rt__Plan__curriculum.json`._
- **[Evitar]** No crear roles nuevos: adjuntar las capabilities a los roles curriculares existentes. _Fuente: `mods/curriculum-design/seed/_data-rbac.js`._
- **[A favor]** Si hay validacion de negocio al crear/editar mas alla de la transicion, usar mutacion validada, no CRUD generico. _Fuente: `mods/curriculum-mapping/CLAUDE.md` (Escrituras gobernadas)._
- **Transversal:** tenant isolation en toda query; correr sync; no editar archivos sincronizados a mano ni commitear artefactos de sync/seed; en codigo/commits/PR usar solo el id Jira. _Fuente: `up1/CLAUDE.md` (Multi-Tenant, Critical Rules, Sync, Commit)._

## Tickets relacionados

| Ticket | Que es | Relacion | Estado |
|---|---|---|---|
| UPONE-1452 | Epic Curriculum Mapping | contenedor | Backlog |
| UPONE-1454 | Esquema de niveles (levelScheme) | dependencia: la matriz referencia la escala (FK) | Finalizada |
| UPONE-1455 | Escalas de cobertura | hermano SP8 (ambos fundaciones del modelo) | Backlog |
| UPONE-1381 | Motor de transiciones de core (enum) | patron para el estado de la matriz | Finalizada |
| UPONE-1459 | Retiro del workflow relacional | antipatron a no reintroducir para el estado | Finalizada |

## Referencias

- Fuente canonica: UPONE-1537.
- Propuesta de modelo: `competency-management-proposal_v3.md` (matriz de competencia, datos generales, fases).
- Planning previa: `sp7/planning-2-transcript-2026-07-20.pdf` (matriz en diseno, sin ticket). Planning SP8: `sp8/transcript-planning-2026-08-04.md` (proceso de dos pasos; cuatro niveles generales sin aporte base).
- Maqueta: `mockup-curriculum-mapping_v4.html` (datos generales de la matriz; planes asociados como vista de solo lectura, no parte de la creacion).
