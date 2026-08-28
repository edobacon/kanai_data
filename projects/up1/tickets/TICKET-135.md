---
id: TICKET-135
project: up1
type: ticket
status: closed
work_type: refactor
external: UPONE-1541
module: curriculum-design
autopilot: autonomous
---

# Curriculum Design · Ajustar seed de requisitos para consistencia con la capacidad del sistema

## Request

Hacer reproducible desde el editor visual la forma del árbol de requisitos sembrado; el seed actual presenta una forma no creable, una promesa incumplida del sistema. Alcance completo: reestructurar el árbol EST200 del seed a la forma que produce el alta (Group[OR] contenedor en la raíz, Group[AND] por vía); duplicar en cada vía las dos condiciones que hoy son globales para preservar la semántica bajo OR; alinear los labels a los literales que persiste la UI sin autoría manual; declarar el momento en las hojas de vía para que las condiciones sean las que produce el selector; retirar el bloque electivo sembrado sobre el Plan preservando K-de-N dentro de una vía; y cerrar el hueco de cobertura con una prueba que corra el loader real. No cambia el esquema del objeto de requisitos ni el motor de evaluación de avance. Bloqueante UPONE-1378 Finalizado. Coordinar con UPONE-1619 (comparten seed-counts.test.ts y docs/reference/seed-counts.md y la corrida del seed).

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | refactor |
| Tipo de cambio | — |
| Modulo principal | curriculum-design |
| Modulos afectados | — |

## Triage

### Hipotesis

Rutas relativas al mod `mods/curriculum-design/` en `uplanner/up1` (working copy contra el que se
verifico el KB). Toda evidencia es lectura directa del codigo (DET-4).

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | La premisa se sostiene: la forma del seed (raiz `Group[AND]` con `Group[OR]` anidado + hojas globales) NO es creable desde el alta del editor | ✓ confirmed | **datos:** raiz `Group[AND]` `seed/_data-requirement.js:97-100`, OR anidado `:102-105`, `MetricThreshold` global hermana del OR `:127-130`, advisory global `:140-143`. **frontend:** `ensureOrContainer` crea el contenedor SIEMPRE en la raiz (`parentId: null`) y reparenta los roots existentes debajo (`requirementCreate.logic.ts:71-83`); no hay camino que cree un `Group` por encima del contenedor. `resolveTargetGroup` cuelga toda hoja de un `Group[AND]` de via o pool (`:104-138`) → hojas globales no creables |
| H2 | `Approved` sin `timing` no es alcanzable como hoja de via (origen de los badges distintos) | ✓ confirmed | **frontend:** el selector de condicion setea `mustBe` + `timing` juntos, siempre, via `COURSE_CONDITION_MAP` (3 opciones: approvedBefore/takeEither/takeConcurrent) `requirementFamilies.logic.ts:74-80`. **datos:** 4 hojas del seed quedan con `mustBe: Approved` sin `timing` `_data-requirement.js:113-124`. Excepcion: hoja de pool electivo usa presets Course sin selector `RequirementEditorElement.vue:833-843` |
| H3 | El arbol aplanado sigue siendo extensible desde el editor sin duplicar contenedores | ✓ confirmed | **frontend:** `findViaContainer` localiza el `Group[OR]` a cualquier profundidad por BFS y devuelve el mas superficial (`requirementEditor.logic.ts:69-77`); `ensureOrContainer` retorna el existente sin tocar estructura si ya hay OR (`requirementCreate.logic.ts:64-65`). "Nueva via" reusa ese OR. La capacidad es de UPONE-1378 y tiene cobertura propia — no se toca (fuera de alcance) |
| H4 | Ningun test existente asserta la forma/conteo del arbol de requisitos, pero el `electiveBlock` tiene 2 consumidores fuera del archivo de datos | ✓ confirmed | **test:** `seed-counts.test.ts` solo asserta que los targets resuelven a Activities reales (`:471-513`), sin ningun `toHaveLength` sobre `requirement` ni sus RT (conteos asertados: activity 301, requirementCategory 80, planEntry 549 — ajenos). **consumers del `electiveBlock`:** el loader lo devuelve (`_data-requirement.js:43,201`), lo lee la linea de log del orquestador (`seed/seed.js:171`, `existed`/`created`/`skip`) y lo mockea el test de entrada (`seed-entry.test.ts:121`) |
| H5 | El guard de idempotencia rompe si no se migra a "por owner" en el mismo paso que la raiz cambia de nodo | ✓ confirmed | **datos:** guard actual es `findFirst({ ownerType:'activity', label:'Requisitos EST200', parentId:null })` `_data-requirement.js:59-61` — busca por label GLOBAL de la raiz autorada. Al aplanar, la raiz pasa a ser el contenedor de vias con label por defecto (`t('requirementAddModal.orRootLabel')`, `RequirementEditorElement.vue:811`), generico y compartible. Sin cambiar el guard a por-owner, busca una raiz que ya nadie siembra → re-seed duplica. Obliga a resolver la Activity antes del guard (hoy es al reves, `:59-65`) |
| H6 | El render del arbol aplanado no pierde informacion, y la diferencia visual que motiva el ticket desaparece | ~ partial → verificar runtime (DET-36) | **render (mecanica confirmada):** el nombre de via lo pone `t('reglaUnificada.viaBadge')` no el label (`RequirementTreeNode.ts:263-268`); el verbo de la hoja lo prefija el render si el label no lo trae (`:270-273`); `findViaContainer`/`deriveVias` leen cualquier forma con fidelidad. **Gap:** el "no pierde info" y "la diferencia desaparece" exigen contraste en pantalla (arbol sembrado vs creado a mano) en UPU — no verificable en intake. Se cierra con smoke UI en execute (DET-36) |
| H7 | El bloque electivo del Plan no es reproducible ni visible, y su retiro conserva un ejemplo K-de-N creable dentro de una via | ✓ confirmed | **datos:** el bloque usa `effect: 'ProgressGate'` y `creditsRequired: 24` (`_data-requirement.js:184-187`), campos que el alta no captura: `DEFAULT_EFFECT = 'EligibilityToEnroll'` (`requirementFamilies.logic.ts:62`) y la familia Elective solo pide pool + K (`:128-136`). **frontend:** el alta hardcodea `ownerType: 'activity'` (`requirementCreate.logic.ts:71,88`); no hay camino para owner `curriculum`. La UI SI crea electivos K-de-N sobre una via (`RequirementEditorElement.vue:815-846`), asi que el caso es preservable dentro del arbol EST200 |

**Gaps activos (active questions):** H6 requiere verificacion runtime en UPU (DET-36) — es DoD del ticket,
no bloquea el design. Decisiones de ejecucion abiertas (no bloqueantes, las resuelve el dev en execute):
cuantas vias siembra el ejemplo (2 basta para mostrar el OR y ejercitar la duplicacion de globales); en
que via va el electivo de reemplazo; prueba de forma como test nuevo o extension de `seed-counts.test.ts`.

### Context found

**KB del ticket (analisis previo verificado, detective-mode SP9) — inyectado en el spec (DET-34/DET-11):**
- `kb/sp9/UPONE-1541-detalle.md` — contrato: alcance, forma objetivo, AC/DoD, tests minimos, estimacion (3 SP / 2 SP sin electivo de reemplazo).
- `kb/sp9/UPONE-1541-pre-intake.md` — enfoque decidido (aplanar), 5 hipotesis semilla, gotchas verificados, decisiones tomadas (dev 2026-08-17).
- `kb/sp9/UPONE-1541-limites-de-escritura-y-retiros.md` — inventario nodo-por-nodo seed vs capacidad del alta; 2 consumidores del `electiveBlock`; follow-ups no creados en Jira.
- `kb/sp9/UPONE-1541-aduana.md` — veredicto frontera **`todo-mod-only`**: ningun artefacto toca objeto Base, resolver mas alla del CRUD generico, componente de libreria compartida, capability o evento.
- `kb/sp9/UPONE-1541-explicativo.html` — narrativa del cambio para el dev (por que el limite esta en el alta, no en la lectura; que se aplana y por que).

**Rules del modulo relevantes:** `RULE-curriculum-design-022` (owner del arbol determinista — el guard
por code lo satisface). Deterministicas: `DET-7` (regression: prueba de forma nueva), `DET-8` (rollback:
re-seed limpio), `DET-16` (propagacion del retiro a sus consumidores), `DET-40` (auditoria de reemplazo:
enumerar que hacia el bloque electivo antes de retirarlo).

**Superficie (pre-intake, confirmada):** 1 archivo de datos del seed + 1 prueba de forma nueva + ajustes
menores en 2 consumidores del `electiveBlock`. Sin cambio de esquema, sin migracion, sin tocar componentes.
No tocar `modsComponents/RequirementEditor/*` ni `modsComponents/ReglaUnificadaView/*` (capacidad de UPONE-1378).

**Coordinacion UPONE-1619:** archivos de datos distintos (`_data-requirement.js` aqui,
`_data-syllabus-sections.js` alla) → paralelizables. Comparten `tests/integration/seed-counts.test.ts`,
`docs/reference/seed-counts.md` y la corrida del seed: acordar orden ahi.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | — |
| Base branch | — |
| DB state | — |
| Services | — |
| Test data | — |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L2 | Smoke en up1 real (2026-08-26): el pool electivo se siembra con `Activity.findMany({recordType:'Course'}, orderBy id asc, take:6)`, que resuelve a las **6 asignaturas demo legacy en Draft** (MAT101 Calculo I, ALG102 Algebra Lineal, FIS103 Fisica General, QUI104 Quimica Basica, PRG105 Programacion I, EST106 Estadistica) — NO a los cursos reales `C-*` del mesh que usan las anclas del arbol. Comportamiento PREEXISTENTE (el bloque electivo viejo hacia igual), no introducido por este ticket, pero incoherente con el principio "casos reales y alcanzables" (S5) que el resto del arbol ya cumple por code. Follow-up sugerido: anclar el pool a cursos `C-*` reales por code (como las hojas del arbol), o al menos a Course `Active`, no Draft. | smoke up1 (S4.T4 en vivo) | 4 | refined | **Resuelto en la misma rama (2026-08-26):** el pool se anclo por code a 6 cursos `C-*` Active (Analisis Numerico, Algoritmos, Bases de Datos, Aprendizaje Automatico, Big Data, Analitica de Negocios) via `ELECTIVE_POOL_CODES`; se reemplazo el `findMany take:6 orderBy id`. Tests actualizados (pool por code), suite 1590 verde. |
| L1 | El label de la metrica (`METRIC_LABEL = 'Métrica (créditos) ≥ 60'`) hardcodea el simbolo `≥` y el valor `60` aparte del `operator/value` del rtData; un cambio futuro del umbral sin tocar el label produciria un "label que miente" (la clase de bug que el codigo viejo evito para hojas de curso derivando `courseLabel`). Sugerencia: derivar el label de la metrica de sus valores. No es bug actual (ambos dicen 60). | reviewer B (S2 dual-judge) | 2 | discarded | — (DET-39: no amerita rule/bug/decision global — es una sugerencia de mantenibilidad puntual del seed, sin bug actual; queda documentada en esta fila como posible follow-up si el umbral cambia) |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Plan de sessions (preplanificacion)

4 sessions previstas. **Esqueleto producido por `intake-explore`.** El detalle final (tasks asignadas,
gate criteria especificos) lo completa `design-refactor` al generar el spec. Cada session puede
subdividirse o colapsarse durante execute si el tamano real difiere.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Prueba de forma contra el loader real, verla pasar con el seed ACTUAL (congela comportamiento vigente antes de cambiar datos) | 1 | T2 | Test de integracion que invoca `loadRequirement` (patron `seed-counts.test.ts` + `makePrismaMock`) y asserta combinador por grupo, jerarquia por padre y campos de hojas | auto | Prueba verde reflejando la forma vieja (red, no espejo) |
| S2 | Reestructurar el arbol EST200 a la forma canonica del alta + ajustar el guard de idempotencia en el MISMO paso | 2 | T2 | Aplanar datos (`Group[OR]` raiz + `Group[AND]` por via, globales duplicadas, labels alineados, `timing` explicito); guard por owner resolviendo Activity antes | ⚑ fuerte | Prueba de forma refleja el cambio esperado; re-seed sobre base limpia no duplica (H5) |
| S3 | Retirar el bloque electivo del Plan + sembrar electivo K-de-N dentro de una via + propagar a los 2 consumidores | 3 | T2 | Quitar bloque `curriculum`; sembrar pool `Group[OR, minToSatisfy]` en una via; ajustar `seed/seed.js:171` y `seed-entry.test.ts:121` sin referencias muertas (DET-40) | ⚑ fuerte | Orquestador y test de entrada coherentes; suite del mod verde |
| S4 | Regresion + verificacion runtime en UPU (DET-36) | 4 | T3 | Suite completa del mod; re-seed idempotente; contraste en pantalla arbol sembrado vs creado a mano (H6); extender desde el editor sin duplicar contenedores | ⚑ fuerte | Evidencia runtime real (screenshot/DOM); sin regresion de la capacidad de UPONE-1378 |
| S5 | Completar i18n del combinador AND/OR en la ficha generica del RT `Group` (en/pt) | 5 | T1 | Crear `lang/en/rt__Group__requirement.i18n.json` y `lang/pt/rt__Group__requirement.i18n.json` espejando `es` (column labels + `enums.combinator.AND/OR`); paridad de keys es/en/pt | auto | Los 3 locales parsean y tienen paridad de keys; el enum combinator resuelve en en/pt (no cae a fallback) |

**Notas del esqueleto:**
- **Numeracion continua** (DET-20): no hay Session previa registrada → el plan arranca en S1.
- S2 y S3 son el nucleo del cambio y quedan aislados con gate ⚑ fuerte (riesgo de idempotencia y de propagacion del retiro).
- H6 (diferencia visual desaparece) se cierra en S4 con smoke UI en UPU — es DoD, no bloquea el design.
- Coordinar con UPONE-1619 el orden de la corrida del seed y `seed-counts.test.ts` / `docs/reference/seed-counts.md` (archivos de datos distintos, paralelizables).
- **S5 agregada post-aprobacion del spec (2026-08-26, a pedido del dev).** Es una extension de scope respecto al spec dual-judge-aprobado (2026-08-18): corrige un gap i18n en la **capa de display** (ficha generica del RT `Group`), fuera del "zero behavior change" del refactor del seed. Independiente de S1-S4 (no comparte archivos ni depende de ellas); puede ejecutarse antes o despues. Origen: hallazgo de esta sesion — `rt__Group__requirement.i18n.json` existia solo en `es`; `en`/`pt` caian a fallback. NO cubierta por el spec-judge original.

### Session 1 — 2026-08-26 — Prueba de forma roja contra el seed ACTUAL (baseline) [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Congelar el comportamiento vigente antes de tocar datos: registrar el baseline de la suite del mod y extender `seed-counts.test.ts` con un describe de forma que corre `loadRequirement` real y asserta la forma ACTUAL (raiz AND, OR anidado, globales bajo raiz, bloque electivo sobre Plan).

**Branch**: `UPONE-1541-seed-shape` (creada desde develop, DET-30 rama != protegida)
**Guard de inicio (DET-30)**: rama != protegida ✓; execute_scope `up1:mods/curriculum-design/` respetado (S1 solo toca `tests/`)

**Tasks completadas**:
- [x] S1.T1 — Snapshot: correr la suite completa del mod y registrar el baseline (`X/X passing`) en `## Regression baseline` del ticket — `mods/curriculum-design/tests/`
- [x] S1.T2 — Extender `seed-counts.test.ts` con describe "forma del arbol" que corre `loadRequirement` y asserta la forma VIGENTE (raiz AND, OR anidado, globales bajo raiz, bloque electivo sobre Plan); reusa `makePrismaMock`/`createsOf` — `mods/curriculum-design/tests/integration/seed-counts.test.ts`
- [x] S1.GATE — Quality review T2 + persistir + decision continue

**S1.GATE — Quality review DET-23 (tier T2, standard) — 2026-08-26:**

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo (sin console.* prod) | pass | solo test + helper de mock; sin console.* nuevo |
| 2 | Lint | pass | esbuild/vitest transform sin errores; TS del test compila |
| 3 | Tipado | pass | 0 `any` nuevos salvo el `any` preexistente del mock (Proxy); interface `SeededNode` tipada; `PrismaCall.id?` additive |
| 4 | Testing | pass | 5 asserts de forma con valores concretos (combinator por grupo, parentId===root.id, metric/mustBe/timing); corre el loader REAL; no tautologico (flipa en S2/S3) |
| 5 | Escalabilidad (DET-41) | n/a | test unit, mock en memoria |
| 6 | Mantenibilidad | pass | helper `buildNodes` por adyacencia base→rt (contrato de `createNode`); fixtures locales |
| 7 | Claridad | pass | comentarios en espanol; nombres descriptivos |
| 8 | a11y | n/a | sin UI |
| 9 | Storybook | n/a | sin componente |
| 10 | Error-handling | n/a | test |

**Cambios al mock compartido (DET-16)**: `makePrismaMock` gana 2 params/campos aditivos (`findManyData` con default `{}`, `PrismaCall.id`) — retrocompatibles; los usos de UPONE-1619 no cambian. Verificado: suite completa 1586/1586 (baseline 1581 + 5), sin regresion.

**Verificacion self-report (DET-33)**: suite re-corrida de forma independiente por el orquestador (no solo self-report del dev): `npx vitest run` → 97 files / 1586 tests passing; `seed-counts.test.ts` → 49/49. Archivos en disco confirmados.

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 2 — 2026-08-26 — Aplanar el arbol EST200 + migrar el guard en el MISMO paso [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Reestructurar el arbol EST200 a la forma canonica del alta (Group[OR] raiz + un Group[AND] por via, 2 vias, globales duplicadas por via, labels de literales UI, timing explicito) y migrar el guard de idempotencia de "por label global" a "por owner" resolviendo la Activity ancla ANTES del guard, en el mismo paso.

**Branch**: `UPONE-1541-seed-shape`
**Guard de inicio (DET-30)**: rama != protegida ✓; execute_scope `up1:mods/curriculum-design/` respetado

**Tasks completadas**:
- [x] S2.T1 — Resolver la Activity ancla (`EST200_ACTIVITY_CODE`) ANTES del guard; guard por `[ownerType:'activity', ownerId:activity.id, parentId:null]` — `mods/curriculum-design/seed/_data-requirement.js`
- [x] S2.T2 — Aplanar: raiz `Group[OR]` "Cualquiera de las vias" + 2 `Group[AND]` "Todos de la via"; via1 = Calculo I + Algebra, via2 = Calculo II; duplicar las 2 globales (metrica creditos, advisory) en cada via; labels de literales UI; timing explicito (Before en hojas Approved) — `mods/curriculum-design/seed/_data-requirement.js`
- [x] S2.T3 — Actualizar el describe de forma a la forma NUEVA (raiz OR, vias AND, cero hojas globales, globales duplicadas por via, timing explicito) — `mods/curriculum-design/tests/integration/seed-counts.test.ts`
- [x] S2.T4 — Prueba de re-seed idempotente: stub `Activity.findFirst` con id estable, correr `loadRequirement` 2 veces, assertar 0 creates de Group/RecordState en la 2a corrida — `mods/curriculum-design/tests/integration/seed-counts.test.ts`
- [x] S2.GATE — Quality review T2 (dual-judge DET-35) + persistir + decision

**S2.GATE — Quality review DET-23 (tier T2, dual-judge DET-35) — 2026-08-26:**

Dos revisores ciegos opus en paralelo (contexto limpio). **Ambos: approve.**

| # | Dimension | A | B | Nota consolidada |
|---|-----------|---|---|------|
| 1 | Calidad | pass | pass | `seedGlobals` DRYea la duplicacion; console.warn son skips legitimos, no debug |
| 2 | Lint | pass | pass | estilo consistente (no ejecutado por los jueces; orquestador corrio vitest) |
| 3 | Tipado | warn | pass | `where?/opts` `any` sigue el patron pre-existente del mock; theoretical |
| 4 | Testing | pass | pass | asserts concretos; re-seed no tautologico (distingue guard-por-owner de por-label) |
| 5 | Escalabilidad | n/a | n/a | cardinalidad fija por el seed (DET-41 n/a) |
| 6 | Mantenibilidad | pass | pass | helper de globales + constantes |
| 7 | Claridad | pass | pass | comentarios trazan cada decision a su REQ |
| 8 | a11y | n/a | n/a | sin UI |
| 9 | Storybook | n/a | n/a | sin componente |
| 10 | Error-handling | pass | pass | skips defensivos con warning |

**Verificaciones clave (ambos, contra codigo):** equivalencia semantica `(A∨B)∧C = (A∧C)∨(B∧C)` confirmada, ninguna global fuera de via; guard por owner con Activity resuelta antes (idempotente real); test de re-seed no es falso positivo del mock (`stableFindFirst` necesario y correcto); cambios al mock aditivos/retrocompatibles. **Juez B verifico labels 1:1 contra i18n/`deriveLeafLabel`/`COURSE_CONDITION_MAP`: coinciden exactos** (orRootLabel, viaGroupLabel, courseLabel `{name} ({code})`, METRIC_LABEL, timings Before/Either).

**Verificacion self-report (DET-33, orquestador):** los jueces no corren vitest (pool Read/Grep/Glob). El orquestador re-corrio la suite: `seed-counts.test.ts` 52/52; suite completa 97 files / 1589 tests passing. Evidencia de ejecucion cerrada.

**Hallazgos:** solo baja/theoretical, ninguno bloqueante ni confirmado por ambos como bloqueante. Diferidos al plan: paridad de labels en runtime (S4.T4/DET-36), actualizar RULE-022 (S4.T3). Learn L1 capturado (label de metrica acoplado).

**Decision: continue** → Session 3 (retiro del bloque electivo + electivo K-de-N en via + propagacion DET-40).

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 3
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 3 — 2026-08-26 — Retiro del bloque electivo del Plan + electivo K-de-N en via + propagacion (DET-40) [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Retirar el bloque electivo sembrado sobre el Plan (owner curriculum, campos no reproducibles ProgressGate/creditsRequired) y su clave `results.electiveBlock`; sembrar en su lugar un pool `Group[OR, minToSatisfy]` reproducible dentro de la via 2 (hojas Course Approved sin timing); propagar el retiro a los 2 consumidores (log de seed.js + mock de seed-entry.test.ts). DET-40 auditoria de reemplazo.

**Branch**: `UPONE-1541-seed-shape`
**Guard de inicio (DET-30)**: rama != protegida ✓; execute_scope `up1:mods/curriculum-design/` respetado

**Tasks completadas**:
- [x] S3.T1 — Retirar bloque electivo sobre Plan + clave `results.electiveBlock`; sembrar pool `Group[OR, minToSatisfy=K]` con hojas Course (Approved, sin timing) dentro de via 2 (profundidad 4); N >= K — `mods/curriculum-design/seed/_data-requirement.js`
- [x] S3.T2 — Propagar el retiro a los 2 consumidores: log `seed.js:170-172` (sin `bloque electivo`) + mock `seed-entry.test.ts:121` (shape sin `electiveBlock`); `grep electiveBlock` sin lecturas muertas — `mods/curriculum-design/seed/seed.js`, `mods/curriculum-design/tests/integration/seed-entry.test.ts`
- [x] S3.T3 — Extender el describe de forma: assertar bloque del Plan retirado (0 Group owner curriculum) + pool K-de-N dentro de via 2 (minToSatisfy, N hojas, sin creditsRequired/ProgressGate) — `mods/curriculum-design/tests/integration/seed-counts.test.ts`
- [x] S3.GATE — Quality review T2 (dual-judge DET-35) + persistir + decision

**S3.GATE — Quality review DET-23 (tier T2, dual-judge DET-35, foco DET-40) — 2026-08-26:**

Dos revisores ciegos opus. Iter 1: A=iterate, B=approve. Iter 2 (tras fix): **A=approve, B=approve.**

**DET-40 (auditoria de reemplazo) — covered (ambos, 1:1):**
| Comportamiento viejo (bloque sobre Plan) | Estado | Evidencia |
|---|---|---|
| K-de-N con `minToSatisfy` | replicado | pool `{combinator:'OR', minToSatisfy:k}` en via 2 |
| Hojas Course Approved SIN timing | replicado | presets del alta, sin `timing` |
| Invariante pool no-vacuo (N>=K) | preservado | skip si <2 cursos; `k=min(4,N)` |
| `creditsRequired: 24` | retirado-intencional | ningun nodo lo usa (test asserta 0) |
| `effect: 'ProgressGate'` | retirado-intencional | owner hereda `EligibilityToEnroll` (test asserta 0) |
| `ownerType:'curriculum'` (Plan) | retirado-intencional | pool cuelga de via 2, owner `activity`; loader ya no consulta `curriculum` |
| `results.electiveBlock` + guard por Plan | retirado + propagado / subsumido | `results` sin la clave; log `seed.js` y mock `seed-entry.test.ts` ajustados; idempotencia del pool cubierta por el guard por-owner del arbol |

**Hallazgos iter 1 (ambos, confirmados) → corregidos iter 2:** (a) docblock de cabecera del seed describia aun el bloque sobre Plan → reescrito; (b) scaffolding muerto en el test (`ELECTIVE_PLAN_CODE`, `planFixtures`, modelo `curriculum` en `makePrismaMock`, comentario stale) → retirado. Sin hallazgos bloqueantes restantes.

**Verificacion self-report (DET-33, orquestador):** los jueces no corren vitest. El orquestador ejecuto: `seed-counts.test.ts` + `seed-entry.test.ts` 59/59; suite completa 97 files / 1590 tests passing. `grep electiveBlock` en seed/ y tests/ = 0.

**Decision: continue** → Session 4 (regresion completa + docs + KB + verificacion runtime UPU DET-36).

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 4
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 4 — 2026-08-26 — Regresion + docs + KB + verificacion runtime UPU (DET-36) [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3 (regression completa)

**Objetivo**: Cerrar el refactor del seed: regresion completa vs baseline S1, actualizar docs (seed-counts.md) y KB (RULE-022 + DEC-LOCAL-01), y verificacion runtime en UPU (DET-36, H6: arbol sembrado vs creado a mano coinciden; extension sin duplicar contenedor).

**Branch**: `UPONE-1541-seed-shape`
**Guard de inicio (DET-30)**: rama != protegida ✓; execute_scope `up1:mods/curriculum-design/` respetado

parallel_groups: [[S4.T2, S4.T3]]

**Tasks completadas**:
- [x] S4.T1 — Regresion completa: suite del mod verde vs baseline S1; sync + re-seed limpio en UPU sin duplicar — `mods/curriculum-design/`
- [x] S4.T2 — Docs (DET-37 dim1): actualizar `docs/reference/seed-counts.md` con la forma nueva del arbol + limites de alta/edicion + motivo del retiro del bloque electivo — `mods/curriculum-design/docs/reference/seed-counts.md`
- [x] S4.T3 — KB (DET-37 dim2): actualizar `RULE-curriculum-design-022` (guard por owner) + registrar `DEC-LOCAL-01` — `deckard/projects/up1/rules/curriculum-design/RULE-curriculum-design-022.md`
- [x] S4.T4 — Verificacion runtime UPU (DET-36, H6): contraste arbol sembrado vs creado a mano; extension sin duplicar contenedor. Evidencia runtime real — UPU (runtime)
- [x] S4.GATE — Quality review T3 (dual-judge DET-35) + persistir + decision

**S4.GATE — Quality review DET-23 (tier T3) — 2026-08-26:**

> **Nota sobre el formato de review**: S4 NO introduce logica ejecutable nueva (solo docs `seed-counts.md`, KB `RULE-022`, y el registro DET-36). El refactor de codigo ya fue dual-judgeado en S2/S3. Por eso la review de S4 es una verificacion directa de exactitud de docs/KB + regresion, no un loop adversarial de codigo (proporcional al contenido).

| # | Dimension | Resultado | Nota |
|---|-----------|-----------|------|
| 1 | Calidad | pass | docs/KB coherentes; sin codigo |
| 2 | Lint | n/a | markdown |
| 3 | Tipado | n/a | — |
| 4 | Testing | pass | regresion completa 1590/1590 vs baseline S1 (delta +9 aditivo, 0 preexistentes rotos) |
| 5 | Escalabilidad | n/a | — |
| 6 | Mantenibilidad | pass | doc y regla trazables a DEC-LOCAL-01 |
| 7 | Claridad | pass | — |
| 8 | a11y | n/a | — |
| 9 | Storybook | n/a | — |
| 10 | Error-handling | n/a | — |

**Verificaciones (orquestador, DET-33):**
- **Doc `seed-counts.md`**: fila `requirement` actualizada a **17** (RecordState 11, Group 4, MetricThreshold 2, todas owner activity). Conteo confirmado por traza del loader: root OR + 2 vias AND + pool OR = 4 Group; (CalcI, Algebra, advisory)_via1 + (CalcII, advisory)_via2 + 6 pool = 11 RecordState; 1 metrica por via = 2. Descripcion de `loadRequirement` actualizada (sin bloque sobre Plan).
- **RULE-022**: refinada de "guard global por label" a "guard coherente con la determinacion del owner" (por owner si determinista por code + label generico; por label si el owner es arbitrario). Cita DEC-LOCAL-01; preserva el porque historico de TICKET-083. Reindex OK.
- **DET-36 (S4.T4)**: registrado `smoke-not-reproducible` con razon auditada (sin UPU vivo ni config smoke). Proxies a nivel codigo cubiertos (forma, labels 1:1, idempotencia). **DoD pendiente de entorno real** documentado.

**Decision: continue** → Session 5 (i18n combinador en/pt).

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 5
- [ ] iterate → re-trabajar Session 4
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 5 — 2026-08-26 — Completar i18n del combinador AND/OR del RT Group (en/pt) [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T1 (unit area)

**Objetivo**: Cerrar el gap i18n de REQ-I18N-01 (DEC-LOCAL-05): `rt__Group__requirement.i18n.json` existia solo en `es`; crear en/pt espejando la estructura (column labels + `enums.combinator.AND/OR`) con paridad de keys.

**Branch**: `UPONE-1541-seed-shape`
**Guard de inicio (DET-30)**: rama != protegida ✓; execute_scope `up1:mods/curriculum-design/` respetado

**Tasks completadas**:
- [x] S5.T1 — `lang/en/rt__Group__requirement.i18n.json` espejando `es` — `mods/curriculum-design/lang/en/rt__Group__requirement.i18n.json`
- [x] S5.T2 — `lang/pt/rt__Group__requirement.i18n.json` espejando `es` — `mods/curriculum-design/lang/pt/rt__Group__requirement.i18n.json`
- [x] S5.T3 — `npm run sync` + smoke UPU (DET-36): combinador resuelve traducido en en/pt — `mods/curriculum-design/`
- [x] S5.GATE — Quality review T1 (paridad es/en/pt) + persistir + decision

**S5.GATE — Quality review DET-23 (tier T1, light) — 2026-08-26:**

| # | Dimension | Resultado | Nota |
|---|-----------|-----------|------|
| 1 | Calidad | pass | 2 archivos i18n JSON, espejo de `es` |
| 2 | Lint | pass | JSON valido (ambos parsean) |
| 3 | Tipado | n/a | JSON |
| 4 | Testing | pass | paridad de keys verificada es==en==pt (5 keys); valores del enum coherentes con `combinatorShort` de common.i18n.json |
| 5-10 | — | n/a | i18n data |

**Verificacion (orquestador, DET-33):** `es==en==pt` (keys `column.{combinator,minToSatisfy,creditsRequired}` + `enums.combinator.{AND,OR}`); en: `All (AND)`/`Any (OR)`; pt: `Todos (E)`/`Algum (OU)`. Ambos JSON parsean.

**S5.T3 sync + smoke (DET-36): no reproducible en esta sesion** (mismo constraint que S4.T4: sin mod-level sync ni UPU vivo). Proxy: paridad verificada estaticamente. Pendiente de entorno real (DoD): confirmar en UPU con locale en/pt que el combinador del `Group` resuelve traducido (no fallback).

**Decision: continue** → request-close (ultima session del plan; S1-S5 done).

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 6
- [ ] iterate → re-trabajar Session 5
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|
| `tests/integration/seed-counts.test.ts` (describe "forma del arbol de requisitos ... S1.T2 baseline", 5 tests) | integration (corre `loadRequirement` real) | S1.T2 | REQ-REFACTOR-06 (forma vigente: raiz AND, OR anidado, globales bajo raiz, 3 hojas Approved, bloque electivo sobre Plan) | vitest |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| Suite completa del mod (baseline S1.T1) | `npx vitest run` | 97 files / 1581 tests passing | 97 files / 1586 tests passing (post S1.T2, +5 shape tests) | +5 (aditivo, sin regresion) |
| seed-counts.test.ts (S1.T2) | `npx vitest run tests/integration/seed-counts.test.ts` | 44 tests | 49 tests (verde, forma vigente) | +5 |
| Regresion final S4.T1 (suite completa del mod) | `npx vitest run` | 1581 (baseline S1) | 97 files / 1590 tests passing | +9 aditivo (forma nueva S1-S3); 0 tests preexistentes rotos |

> **S4.T1 — sync + re-seed en UPU: no reproducible en esta sesion.** El mod no expone script `sync`/`seed` propio (el seed corre via el `dbSync` de la plataforma), y no hay entorno UPU vivo (Postgres + app) en esta sesion de autopilot. La idempotencia por-owner se verifico a nivel loader con la prueba de re-seed (S2.T4, mock stateful). El re-seed limpio contra una BD real de UPU queda como verificacion de entorno pendiente (junto con S4.T4 runtime), a ejecutar por el dev en un UPU real antes del cierre definitivo.

## Summary
