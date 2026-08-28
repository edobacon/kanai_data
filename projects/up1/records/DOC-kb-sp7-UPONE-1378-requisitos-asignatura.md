---
id: DOC-kb-sp7-UPONE-1378-requisitos-asignatura
project: up1
type: doc
---

# UPONE-1378 - Requisitos de asignatura (editor visual Y/O + alerta de impacto)

- **Titulo Jira:** Curriculum Design | SP7 · P1 - Requisitos de asignatura (editor visual Y/O + alerta de impacto)
- **Tipo:** Historia · **Epica:** [UPONE-1267](https://u-planner.atlassian.net/browse/UPONE-1267) Curriculum Design
- **Dueno:** Eduardo Bacon · **Prioridad:** Mayor · **Estado:** Backlog · **SP Jira:** 8
- **Ticket DKC:** [TICKET-101](../../../deckard/projects/up1/tickets/TICKET-101.md) (`external: UPONE-1378`, `layer: mod`, `creates_visual: true`)
- **Fecha ficha:** 2026-07-21 · **Repo:** mod (FE + habilitador BE) + up1-mcp

> **Historia arrastrada de SP6 a SP7.** Se planifico y scaffoldeo en SP6 (TICKET-101, `status: open`)
> con analisis de alcance profundo, pero **no se ejecuto**. Pasa a SP7 como P1 de curriculum-design.
> Jira ya renombro el titulo a "SP7 · P1". Esta ficha consolida la revision previa (que NO hay que
> rehacer) y el estado de codigo, y deja marcado que decisiones quedan abiertas.

---

## 1. Request (literal Jira, DET-3)

Como **configurador curricular**, quiero editar los prerrequisitos y correquisitos de una asignatura
como un arbol de condiciones (Y/O) y ver que planes se ven afectados al cambiarlos, para definir las
condiciones de la malla sin depender de seeds.

**Alcance:** edicion y persistencia del arbol. **Fuera de alcance:** el motor que evalua el avance
del estudiante (degree-audit), documentado.

---

## 2. Revision previa existente (NO rehacer)

Este ticket ya tiene trabajo de analisis acumulado. Fuentes autoritativas:

| Fuente | Que aporta | Estado |
|---|---|---|
| **MC-03** ([sp5/prespecs/MC-03.md](../sp5/prespecs/MC-03.md)) / TICKET-083 | Modelado del objeto `requirement` (Composite, 3 RecordTypes) + bloque electivo | **closed** (SP5) |
| **MC-09** ([sp5/prespecs/MC-09.md](../sp5/prespecs/MC-09.md)) / TICKET-089 | Guard de plan Active + alerta de impacto al editar requisitos | **closed** (SP5) |
| **TICKET-101** (DKC) | Analisis de alcance profundo (2026-07-07, verificado contra codigo): 6 decisiones de alcance, pre-spec REQ-01..09, BL-1, riesgos | `open`, pre-spec listo |
| [sp6/historias-usuario-sp6.md](../sp6/historias-usuario-sp6.md) §P1 | Historia P1 (fuente de design) | referencia |
| [sp6/mockup-sp6.html](../sp6/mockup-sp6.html) | Maqueta del editor (pestaña + modal 2 pasos + arbol) | referencia |
| [sp5/sp5-seed-fixtures.md](../sp5/sp5-seed-fixtures.md) §2 | Arbol de ejemplo EST200 (3 niveles) para test data | referencia |

**Conclusion:** el modelo y el guard ya existen (SP5). Lo que falta es el **editor FE** mas un
**habilitador BE** (BL-1). El pre-spec REQ-01..09 ya esta transcrito en TICKET-101.

---

## 3. Estado de codigo verificado (2026-07-07, revalidar al ejecutar)

### Lo que YA existe (se reusa)

- **Objeto `requirement`** modelado y sembrado: `mods/curriculum-design/objects/requirement.json` +
  3 RecordTypes. Arbol Composite por `parentId`, base polimorfica `ownerType`/`ownerId`.
  - `Group` (`combinator` AND/OR, `minToSatisfy`, `creditsRequired`).
  - `RecordState` (`targetType`=activity, `targetId`, `mustBe`, `thresholdMinGrade`, `timing`).
  - `MetricThreshold` (`metric`=Credits, `scope`, `operator`, `value`).
- **Layouts por RT** ya declarados: `default_rt__Group__requirement_{create,edit,view}.json`,
  idem `rt__MetricThreshold__requirement` y `rt__RecordState__requirement` (RecordDetail, sin `_list`,
  no en menu).
- **Helpers puros:** `buildRequirementTree.js` (items planos → arbol, con deteccion de ciclos).
- **Guard de dominio:** `logic/helpers/requirementActivityGuard.js` (MC-09/TICKET-089): bloquea
  crear/editar `requirement` si la Activity duena esta en un `Curriculum status=Active`. **La alerta
  de planes afectados (REQ-05) es el frente FE de este guard** (query `planEntry.activityId` →
  `Curriculum.status`).
- **RBAC ya declarado:** `capabilities.json` (`requirement:view/create/modify/delete`). REQ-06 es
  wiring FE, no capability nueva.
- **Test data:** seed EST200 (`seed/_data-requirement.js`), arbol de 3 niveles + bloque electivo.

### Lo que FALTA (el trabajo real)

- **Editor FE nuevo (mod-native):** pestana "Requisitos" en la ficha de Activity + modal de alta en
  2 pasos + arbol Y/O anidable editable + alerta de planes afectados. Es **UI nueva** que toma piezas
  de bajo nivel de `CompositeSectionTree` (`treeOps`, keyboard nav), NO extiende ese componente (su
  modal es de 1 paso, sin combinador AND/OR).
- **BL-1 (habilitador BE, prerequisito):** el UPDATE de `rt__*__requirement` **no existe**.
  `logic/polymorphicUpdate.resolver.js:159` tiene `RT_PATTERN` hardcodeado a `curricularsection`. SP5
  entrego create+read; para que el arbol sea *editable* hay que extender `RT_PATTERN` a
  `(curricularsection|requirement)` + regresion de CurricularSection (codigo compartido). Es trabajo
  BE del mod aunque Jira lo rotule "mod (FE)".
- **Convencion de create:** el create actual de `requirement` usa el base `REQUIREMENT`
  (`requirement-write.ts:209`), que **no persiste bien los campos RT-especificos**. Hay que alinearlo
  al patron RT literal (`rt__Group__requirement`), como CurricularSection.
- **MCP:** `cd_manage_requirement` hoy solo soporta view+create; falta `action: update`/`delete`.

---

## 4. Decisiones de alcance ya tomadas (dev, 2026-07-07 — en TICKET-101)

1. **RecordType = RT literal** (`rt__Group__requirement`) para create/update/MCP/FE, unificado como
   CurricularSection. BL-1 ampliado: corregir el create + extender `RT_PATTERN` + FE usa RT literal.
2. **Editor = arbol Y/O anidable a cualquier profundidad** (REQ-03 literal), no la UX de "vias" de 2
   niveles del mockup (el seed EST200 tiene 3 niveles).
3. **El editor permite eliminar nodos + guard de plan Active** extendido al delete de `requirement`.
4. **Familias del modal (paso 1) = solo las 3 con respaldo:** Curso (`RecordState`), Electivo
   (`Group` OR), Metrica-Creditos (`MetricThreshold`). No mostrar gpa/period/competency/program.
5. **Dependencias circulares cruzadas (CAP-CUR-004, Must): validacion completa** al guardar un
   `RecordState` (recorrer el grafo transitivo y rechazar ciclos). Amplia el alcance de P1.
6. **REQ-09 (solo DKC, no en Jira): no-negativos** (`minimum: 0`) en los campos numericos que el
   editor crea/edita (RT de `requirement`). El barrido al resto de campos numericos del mod se movio
   a [TICKET-105](../../../deckard/projects/up1/tickets/TICKET-105.md).

---

## 5. Pre-spec (AC de Jira, resumen)

| REQ | Enunciado |
|---|---|
| REQ-01 | Pestana "Requisitos" en la ficha de Activity; muestra el arbol existente o vacio con grupos Y/O. |
| REQ-02 | Modal de alta en 2 pasos (paso 1: tipo; paso 2: detalle); la condicion se anade al grupo seleccionado. |
| REQ-03 | Arbol Y/O anidable, editable; persiste en `requirement` y se reconstruye identico al reabrir. |
| REQ-04 | No permite guardar una condicion incompleta (mensaje claro). |
| REQ-05 | Alerta de planes afectados al guardar (lee `planEntry.activityId`); sin aviso si no hay planes; el aviso no modifica datos. |
| REQ-06 | RBAC: crear/editar gateado por capability; pestana y acciones no aparecen sin permiso. |
| REQ-07 | Sin motor de evaluacion del avance (fuera de alcance, documentado). |
| REQ-09 | (solo DKC) no-negativos en los campos numericos que P1 crea/edita. |

**DoD (Jira):** tests unit + integration en verde con assertions concretas · lint + Prettier + tsc
limpios (incl. tests y stories) · lang ES completo · sin artefactos de sync/seed commiteados · tools
up1-mcp actualizadas y verificadas · quality review + smoke en UPU.

---

## 6. Conexion con UPONE-1456 (seed)

`requirement` (el objeto de este ticket) **no viene en el paquete de seed** de 1456 (que solo trae
`requirementCategory`, las lineas de formacion). No es un gap del seed: **se espera crear los
prerrequisitos con la UI de este ticket** (1378), no cargarlos por seed. Ver
[UPONE-1456-analisis-seed.md](UPONE-1456-analisis-seed.md) §4. Entonces 1456 deja la base poblada
(programas, planes, malla, secciones) y 1378 entrega la herramienta para construir los prerrequisitos
encima. Test data de prerrequisitos disponible hoy solo via `seed/_data-requirement.js` (EST200).

---

## 7. Riesgos

- **BL-1 subestimado:** el create de `requirement` no esta verificado end-to-end por la mutacion
  GraphQL/MCP (solo por seed Prisma directo). Verificar con el servidor corriendo antes de estimar.
- **Regresion de CurricularSection** al tocar el `RT_PATTERN` compartido en `polymorphicUpdate`.
- **Guard de delete ausente:** hoy no hay guard de delete para `requirement`; si el editor borra
  nodos, falta extender el override de `deleteInstance` (H7, archivo unico por mod).
- **UI que promete familias no persistibles** (mockup ofrece gpa/period/competency/program sin
  respaldo en el modelo). Mitigado por la decision #4.

---

## 8. Esfuerzo

- **SP Jira: 8** · **Estimado DKC: 13** (`post-deep-analysis-2026-07-07`).
- La decision #5 (validacion completa de ciclos) amplia el alcance → los 8 SP publicados quedan
  cortos; revalidar al armar el spec formal. Calibracion DKC (sesgo +100% global) proyecta el editor
  bastante por encima de 8.
- **Veredicto:** 8 optimista. 13 mas realista; podria subir con BL-1 + validacion de grafo. Confirmar
  al hacer design-feature.

---

## 9. La maqueta actual vs el alcance (hallazgo de diseño)

La maqueta de SP6 ([sp6/mockup-sp6.html](../sp6/mockup-sp6.html), pestana Requisitos `:981`, modal 2
pasos `:1073`) trae **un solo caso**: OR-de-ANDs de 2 niveles (el modelo de "vias"). Su `reqTree`
(`:1724`) se computa como OR de vias, cada via un AND de hojas. **No puede representar el alcance
decidido** (arbol anidable a cualquier profundidad, decision #2): el seed EST200 tiene 3 niveles y un
AND en la raiz que combina un sub-arbol OR con condiciones sueltas, cosa que el modelo de vias no
expresa. Las 3 familias del modal (`:1729`: course/pool/credits) si coinciden con las 3 con respaldo
(decision #4). Conclusion: la maqueta cubre la **cascara** (pestana, lista, modal, vista de regla,
alerta), pero **no el editor del arbol**, que es el nucleo. Por eso el ticket incluye un design-draft
nuevo (DET-18) antes del spec.

### Casos que se extienden del ejemplo de la maqueta

**A. Estructura del arbol**
- AND en la raiz que combina un sub-arbol OR con condiciones sueltas (raiz EST200).
- Anidamiento de 3+ niveles (`AND > OR > AND > hojas`).
- Grupo con `minToSatisfy` (K de N) + `creditsRequired` como nodo interno anidable (no como hoja).
- Combinaciones libres OR/AND en cualquier nivel.

**B. Tipos de nodo y campos del modelo**
- `effect` del arbol: `EligibilityToEnroll` (unico en la maqueta) vs `ProgressGate`/`Completion`/`DiplomaAward`.
- `negate` (NOT) a nivel de grupo, no solo anti-requisito por curso.
- `timing` correquisito (`Concurrent`/`Either`), no solo `Before`.
- `MetricThreshold`: `scope` plan/category + operadores `>=,>,=,<,<=`.
- `isHardRule` (obligatorio/recomendado) mezclado dentro de un grupo (EST200: PROG101 soft junto a hard).

**C. Operaciones de edicion (la maqueta es solo de alta)**
- Mover/reordenar nodo entre grupos; anidar grupo en grupo; crear grupo.
- Cambiar el `combinator` (AND<->OR) de un grupo existente.
- Convertir una hoja en grupo (envolver).
- Editar/eliminar nodo intermedio y su subarbol (+ guard plan Active, decision #3).
- Normalizacion de grupos degenerados (1 hijo = el hijo; grupo vacio).

**D. Validacion**
- Ciclos cruzados entre Activities (CAP-CUR-004, Must): grafo transitivo A->B->C->A al guardar `RecordState`.
- Condicion incompleta (REQ-04) en nodos intermedios, no solo hojas.

## 10. Checklist de opciones para el design-draft (nueva maqueta)

> El ticket es `creates_visual: true` → DET-18 exige un **design-draft aprobado**
> (`tickets/TICKET-101.draft/preview.html`) ANTES del spec formal. Este checklist es el input: la
> maqueta nueva debe **cubrir todos estos casos** para tomar una decision informada. Cada bloque
> tiene opciones a resolver en el draft.

**1. Representacion del arbol (decision central)**
- [ ] Profundidad: arbitraria (decision #2) → el draft debe mostrar 3+ niveles, no 2.
- [ ] Metafora visual (elegir una): (a) arbol indentado con lineas de conexion; (b) tarjetas/bloques
      anidados con color por combinador; (c) diagrama de nodos. Pros/contras de cada una.
- [ ] Combinador AND/OR por grupo: como se muestra y como se cambia (toggle en el header del grupo).
- [ ] `minToSatisfy` (K de N) y `creditsRequired` editables inline en cada grupo.
- [ ] Grupo raiz: `label` (requerido), `effect`.

**2. Nodos hoja y campos (solo las 3 familias con respaldo)**
- [ ] Curso (`RecordState`): catalogo Activity (busqueda + filtro depto), `mustBe` (Approved/Taken),
      `timing` (Before/Concurrent/Either), `thresholdMinGrade`, `negate` (anti-requisito), `isHardRule`.
- [ ] Metrica-Creditos (`MetricThreshold`): `metric` (Credits), `scope` (plan/category), `operator`, `value`.
- [ ] Electivo (`Group` OR): `minToSatisfy`, `creditsRequired`, hijos (cursos).
- [ ] Excluidas (decision #4): NO mostrar gpa/period/competency/program.

**3. Operaciones de edicion (el draft debe mostrarlas, no solo el alta)**
- [ ] Agregar nodo (modal 2 pasos) al grupo seleccionado.
- [ ] Crear grupo / anidar grupo dentro de grupo.
- [ ] Cambiar el combinador de un grupo existente.
- [ ] Mover/reordenar nodo (drag vs botones subir/bajar/mover-a-grupo).
- [ ] Convertir hoja en grupo (envolver una condicion).
- [ ] Editar nodo (intermedio y hoja).
- [ ] Eliminar nodo/subarbol + confirmacion + guard plan Active.
- [ ] Grupos degenerados: que hace la UI con 1 hijo o grupo vacio.

**4. Validacion y feedback**
- [ ] Condicion incompleta (REQ-04): mensaje claro, por nodo.
- [ ] Ciclos cruzados (CAP-CUR-004): feedback al guardar un `RecordState` que formaria ciclo.
- [ ] Reconstruccion identica (REQ-03): el draft carga EST200 y lo reconstruye igual.
- [ ] Mensajes accionables (ej. sugerir versionar si el plan esta Active).

**5. Alerta de impacto (REQ-05)**
- [ ] Cuando dispara: al guardar requisito de una Activity usada en varios planes.
- [ ] Que muestra: lista de planes afectados + su status; sin aviso si no hay planes.
- [ ] No modifica datos; comparte query con `requirementActivityGuard` (`planEntry.activityId` → `Curriculum.status`).

**6. Estados y modos**
- [ ] Vacio: "sin requisitos, matricula libre".
- [ ] Solo lectura (sin capability) vs edicion (RBAC REQ-06: pestana/acciones ocultas sin permiso).
- [ ] Arbol de 1 hoja.
- [ ] Vista de "regla unificada" en texto humano (decidir si entra).

**7. Alcance a confirmar en el draft (in/out) — cosas de la maqueta vieja o del modelo no cerradas**
- [ ] Herencia MADS para silabo (Hereda/Agrega/Reemplaza, `:988`): ¿entra? No esta en las AC de Jira.
- [ ] "Regla unificada" (texto humano): ¿entra?
- [ ] Correquisitos (`timing: Concurrent`): ¿en alcance de esta historia?
- [ ] `negate` a nivel de grupo: ¿en alcance?
- [ ] `effect` distinto de `EligibilityToEnroll`: ¿un arbol por effect o varios?

**8. Transversal (DoD)**
- [ ] i18n ES completo · a11y (teclado, roles ARIA en el arbol) · tokens `var(--up1-*)` · stories del editor y del modal.

### Arboles de ejemplo para el draft (test data + validacion de cobertura)

El draft debe renderizar y editar al menos estos, para probar los casos A-D:

1. **T1 - EST200 (ya en seed):** `Group[AND]{ Group[OR]{ Group[AND]{MAT110,MAT120}, MAT210 }, MetricThreshold(Credits>=60,plan), RecordState(PROG101,soft) }`. Cubre A (3 niveles + AND raiz mixto), isHardRule mezclado.
2. **T2 - Correquisito + anti-requisito:** `Group[AND]{ RecordState(A,Approved,Before), RecordState(D,Concurrent) [correq], RecordState(C,negate) [anti-requisito] }`. Cubre B (timing Concurrent, negate).
3. **T3 - Electivo K-de-N anidado:** `Group[AND]{ RecordState(X,Approved,Before), Group[OR, minToSatisfy:4, creditsRequired:24]{ 6 cursos } }`. Cubre A (grupo con K-de-N + creditos como nodo interno).

## 11. Que sigue

- El ticket DKC (TICKET-101) se actualiza a **sprint SP7** (era SP6, arrastrado). Ver frontmatter.
- Al tomarlo: flujo `implement` (design-feature → SPEC formal transcribiendo REQ/tasks 1:1 → execute).
  El pre-spec y las 6 decisiones de alcance ya estan; el design formal parte de ahi, no de cero.
- **Primer paso tecnico recomendado:** verificar BL-1 (create/update de `rt__*__requirement`) con el
  servidor corriendo, porque condiciona el resto del editor.

> Verificacion de codigo heredada de TICKET-101 (2026-07-07). Revalidar rutas:linea al ejecutar
> (los repos co-ubicados en `uplanner/up1/` pueden haber cambiado desde entonces).
