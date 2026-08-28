---
id: DOC-kb-sp8-UPONE-1539-pre-intake
project: up1
type: doc
---

# Pre-intake tecnico - UPONE-1539 (malla modular)

> Material de trabajo del implementador (Eduardo). Alimenta el intake/execution del ticket UPONE-1539.
> Ticket (contrato): `sp8/UPONE-1539-detalle.md`. Verificado contra codigo real en `uplanner/up1` (2026-08-04).

## Veredicto

Feature nueva apoyada en reuso del SP7. Superficie estimada: 6-9 archivos.

## Componente de render

- `mods/curriculum-design/modsComponents/CurriculumMesh/CurriculumMeshElement.vue` (custom Vueform element, UPONE-1348). Columnas = periodos fijos: `columns` computed llama `groupByPeriod(...)` (l.545-547); header usa `curriculumMesh.period` con `n:idx+1` (l.225). Drag&drop SortableJS (grupo `cm-periods`) persiste `{id,period,position}` via `updateInstance` (l.636-652, 692-744). Agregar/quitar periodo maneja `viewPeriodCount` (l.539-591), no persiste en `totalPeriods`.
- Logica pura: `curriculumMesh.logic.ts` -> `groupByPeriod` (l.210-240).

## Logica de prerrequisitos SP7 (reusable, NO deriva nivel)

- `evaluateRequirementTree.logic.ts` (evaluador Y/O/K-de-N; evalua satisfaccion contra un `ownerPeriod`, no calcula nivel).
- `prereqCheck.logic.ts` (`findMissingPrereqs`, usado por `PrereqBlockModal` al agregar).
- `meshPrereqScan.logic.ts` (`scanMeshViolations`, banner no bloqueante).
- `usePrereqRequirements.ts` (trae el arbol de requisitos por actividad), `useMeshPrereqScan.ts` (cache por `activityId`).

## Modelo

- `mods/curriculum-design/objects/planEntry.json`: `period` integer `not_null` y en `required` (l.61-66, 89). No existe campo `level`. El schema documenta "modular nullable -> SP7" (l.9, l.65) pero no se implemento: deuda que 1539 hereda.
- `progression` no se consume en la malla: `PlanVM` (l.82-88) solo `{totalPeriods,totalCredits,status}`; `useCurriculumMesh.ts` no lee `progression`. El componente no ramifica por tipo hoy.

## Puntos de extension (respetando separacion `.vue` delgado + `.logic.ts` puro + `use*`)

- Cablear `progression` a `PlanVM` en `useCurriculumMesh.ts`.
- Nueva funcion pura de derivacion de nivel desde el grafo de prerrequisitos-curso (extraer los `RecordState`, calcular `nivel = 1 + max(nivel de prereqs presentes)`, con deteccion de ciclos; no hay utilidad de ciclos en el FE, solo un guard en backend).
- Nueva `groupByLevel` paralela a `groupByPeriod`, misma forma de salida (`MeshCard[][]`), para que el `.vue` branchee `columns` por `progression` sin tocar el `v-for` de columnas; header condicional Nivel/Periodo.
- Reuso directo: carga y cache del arbol de requisitos del SP7.

## A resolver en intake (decisiones de producto)

- Reordenar en modular: solo lectura (recomendado) vs mantener drag con otra semantica.
- `planEntry.period` en modular: nullable (toca modelo + resolvers + regresion secuencial) vs conservar ignorado y usar solo el nivel derivado. Esta decision mueve la estimacion de 8 a 13 SP.
- Ocultar o no el control de agregar/quitar periodo en modular.

## Correctitud de la derivacion de nivel (antecedentes SP7)

Al recorrer el arbol de requisitos para derivar nivel, cuidar tres casos ya conocidos del SP7:
- **Contenedores estructurales `Group` (OR/AND)**: no son prerrequisitos-curso; excluirlos del calculo de profundidad (el SP7 los oculta en listas con `recordType NOT_EQUALS Group`; replicar ese criterio).
- **Grupos vacios huerfanos**: un `Group` sin hojas evalua como `satisfied:true` (vacuo) en el evaluador del SP7; en derivacion de nivel un prereq "vacio" no debe contarse ni bajar el nivel. Excluirlos igual que hace `pruneEmptyGroups` en el render.
- **Pool electivo K-de-N con N < K** (invariante que se puede romper por ediciones hoja a hoja, `UPONE-1378-out-of-scope-followups.md` §6): la funcion de nivel debe tolerar pools inconsistentes sin fallar.

## Verificacion runtime

Reusar el enfoque de smoke del SP7 (fixture SQL `UPONE-1378-smoke-fixture.sql` contra tenant UPU, ver `sp7/UPONE-1378-smoke-test-replication-v2.md`) en vez de crear uno desde cero.

## Gotchas de plataforma

- Layout config `cache-first` (Apollo): hard reload tras `npm run sync` al verificar.
- Sync NO propaga carpetas solo-logica (`.ts` puro sin componente-entry): si los nuevos `.logic.ts` van en una carpeta nueva sin componente, verificar que se sincronizan (colocarlos junto al componente existente evita el problema).
- i18n: agregar la key de nivel en el namespace `curriculumMesh` cuida paridad es/en/pt; conflicto de key aborta el sync.

## Factores transversales (detalle)

- i18n: agregar la key del rotulo "Nivel" (encabezado de columna en modo modular) y los mensajes del flujo de agregado en `lang/{es,en,pt}` del mod, con paridad. Hoy el header usa `curriculumMesh.period`; el modular necesita su equivalente `curriculumMesh.level`.
- a11y: la malla ya maneja foco/teclado en secuencial; validar que el modo por niveles mantiene el patron (columnas = niveles).
- Storybook: el componente de malla tiene story; agregar el estado modular.
- Design tokens: la UI de columnas ya usa `var(--up1-*)`; el modo modular no debe introducir hardcode.

## Reglas/patrones y su fuente (traza)

- Reusar el evaluador y el recalculo de posicion. Fuente: `mods/curriculum-design/docs/architecture/curriculum-mesh-guards-prereqs.md`; `modsComponents/CurriculumMesh/{evaluateRequirementTree,prereqCheck,meshPrereqScan}.logic.ts`.
- Evaluacion fiel al arbol Y/O; no aplanar a AND global ni mirar solo hijos directos. Fuente: `modsComponents/CurriculumMesh/evaluateRequirementTree.logic.ts`.
- Ningun Group/pool huerfano; grupo vacio = falso-satisfecho. Fuente: `modsComponents/CurriculumMesh/*.logic.ts`; seed `_data-requirement.js`.
- `position` bifurcado (malla 0-based vs `CompositeSectionTree` 1-based); normalizar al tocar drag&drop. Fuente: `modsComponents/CurriculumMesh/*` vs `layout/src/modsComponents/CompositeSectionTree/*`.
- Patron Vueform element + Apollo tenant + sortablejs + modales caseros (el gestor de modales global no se expone a Vueform elements); logica en `.ts` puros. Fuente: precedente `CompositeSectionTree`; componentes de `CurriculumMesh`.
- Malla siempre montada (`v-show`, sin keep-alive) -> refetch manual (`onActivated` no aplica). Fuente: `modsComponents/CurriculumMesh/CurriculumMeshElement.vue`.
- No carpetas solo-logica sin componente-entry (el sync no las propaga). Fuente: `object-manager/scripts/sync`.
- `defineElement` (Vueform) es Options API; no Composition APIs dentro de un computed getter. Fuente: precedente `ActivityStatusBadgeElement.vue`; docs Vueform.
- Tenant filtering; el client per-tenant no lleva `tenantId`. Fuente: `object-manager/src/graphql/resolvers/`; `up1/CLAUDE.md`.
- planEntry.categoryId `onDelete: Restrict`: guard de borrado ya existe (`assertNoEntriesForCategory`), reusar. Fuente: `docs/architecture/curriculum-mesh-guards-prereqs.md`.

## Archivos candidatos

2-3 modulos `.logic.ts` nuevos + specs; `useCurriculumMesh.ts` y `CurriculumMeshElement.vue` modificados; `lang/{es,en,pt}` del mod (nueva key de nivel); story del componente; potencialmente `planEntry.json` + resolvers si se decide `period` nullable.
