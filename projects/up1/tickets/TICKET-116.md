---
id: TICKET-116
project: up1
type: ticket
status: closed
work_type: fix
external: UPONE-1378
module: curriculum-design
autopilot: manual
---

# Fix atribucion del faltante en el modal de prerrequisitos + label/timing del advisory del seed

## Request

Registrar y commitear dos bloques de cambio que ya estaban implementados en el working tree del mod `curriculum-design`, en una sola rama nueva desde `develop` actualizado, cada bloque con su id externo propio, para salir en un unico PR:

1. **Atribucion del faltante en el modal de prerrequisitos (UPONE-1378, feedback del dev)**. El modal de bloqueo reportaba el contenedor mas superficial en vez del requisito que realmente falla. Como el editor visual envuelve todo requisito en un `Group[OR]` de via unica, el usuario siempre leia "Cualquiera de las vias — 0 de 1 cursos" sin saber QUE le faltaba. Ademas, cuando el faltante si es una eleccion real (OR / K-de-N / creditos), el modal no mostraba con que opciones se puede cumplir.

2. **Label y timing del nodo advisory del seed (UPONE-1456)**. El label `Haber visto X (advisory)` salia duplicado en pantalla porque el render de `ReglaUnificadaView` prefija el verbo derivado de `mustBe` cuando el label no empieza con `aprobar|cursar` ("Cursar Haber visto X"), y el nodo quedaba con `mustBe: Taken` sin `timing`, combinacion que el editor no ofrece.

Origen: peticion del dev en sesion 2026-07-31 ("crea una nueva rama desde develop actualizado para 1378, alli vamos a comitear ambos, cada bloque con su respectivo ticket, lo vamos a anadir a un ticket fix de dkc para mantener el registro, despues eso podemos hacer 1 pr con ambos fixes ya que estarian en la misma rama").

## KB consulted

- **Rules**: [RULE-dev-004](../rules/dev/rule-dev-004.md) — no aplica como bloqueo: este trabajo es `layer: mod`, todo dentro de `mods/curriculum-design/`, sin edicion directa de `layout/`, `object-manager/` ni `suite/`. La rama lleva el id externo (`UPONE-1378`) igual, por DET-19.
- **Specs**: [SPEC-curriculum-design-activity-requirements-section](../specs/spec-curriculum-design-activity-requirements-section.md) (de TICKET-101, cerrada) — es la spec que define el contrato `MissingPrereqItem[]` y el evaluador recursivo que este fix modifica. Este ticket la extiende con un campo opcional; no la contradice.
- **Bugs**: n/a — no hay bug abierto de `curriculum-design` sobre el modal de prerrequisitos ni sobre los labels del seed.
- **Tickets previos**: [TICKET-101](TICKET-101.md) (UPONE-1378, cerrado 2026-07-29) construyo el evaluador recursivo en S7 y el modal; este ticket corrige su UX de reporte. [TICKET-113](TICKET-113.md) (UPONE-1456, cerrado en DKC 2026-07-30 pero **Developing en Jira**) es el dueno del seed demo rev.2 que aqui se corrige.

## Discoveries / decisions

- D1: El editor visual siempre envuelve el requisito en un `Group[OR]` de via unica. Por eso el bug se percibia en el 100% de los casos creados por UI: el evaluador reportaba ese grupo envoltorio ("0 de 1 cursos") y el faltante concreto nunca llegaba al modal. El render del arbol ya resolvia el mismo problema con `collapseSingleVia`; el evaluador no tenia su equivalente.
- D2: No todo grupo debe descender al hijo. Tres casos deben seguir reportando el grupo, porque el motivo no vive en ningun hijo: (a) `creditsRequired` propio del grupo — los hijos pueden estar todos satisfechos y el grupo fallar igual (hoja negada + umbral); (b) `negate` — descender diria lo contrario de lo que el requisito exige; (c) alternativa real (OR / K-de-N con >=2 hijos), donde el usuario tiene que elegir y un faltante unico seria enganoso.
- D3: Las "posibilidades" de una alternativa deben omitir lo YA satisfecho. Si media rama esta cumplida, volver a pedirla es ruido. De ahi que `describeBranch()` recorra solo lo pendiente y una con `y`/`o` segun el combinator.
- D4: `mustBe: Taken` sin `timing` lo lee el evaluador como `Before` (default), pero el editor solo ofrece 3 condiciones (`approvedBefore`, `takeEither`, `takeConcurrent`). El seed estaba produciendo un estado no alcanzable desde la UI. `Either` (correquisito recomendado, antes o en paralelo) es el equivalente real y mantiene el caso del seed reproducible desde el editor.
- M1 (micro-decision): el bloque 1 se atribuye a **UPONE-1378** aunque la historia este `Finalizada` en Jira. Es feedback sobre lo shippeado por esa historia, no alcance nuevo; por DET-19 el commit y la rama llevan ese id. No se crea issue nuevo en Jira (decision del dev).
- M2 (micro-decision): el bloque 2 se atribuye a **UPONE-1456**, que sigue en `Developing` en Jira, en vez de arrastrarlo a 1378. Ambos bloques conviven en la misma rama y salen en un PR unico porque el cambio del seed es justamente el dato con el que se ejercita el modal (decision del dev).
- M3 (micro-decision): la deuda de `vue-tsc` (78 errores) y el ESLint roto del monorepo se dejan fuera de alcance; son preexistentes y ajenos al diff (ver Testing).

## Learns

| # | Learn | Fuente | Session | Status | Destino |
|---|-------|--------|---------|--------|---------|
| L1 | El render de `ReglaUnificadaView` prefija el verbo derivado de `mustBe` cuando el label no empieza con `aprobar\|cursar`. Todo label de nodo `RecordState` (seed, fixtures, creacion por API) debe usar el verbo canonico y NO llevar la condicion en el texto: el render la muestra como badge aparte. Un label en prosa produce duplicacion visible. | D1/D4 · seed `_data-requirement.js` | S1 | refined | [RULE-curriculum-design-045](../rules/curriculum-design/rule-curriculum-design-045.md) (clausula 1) |
| L2 | Las combinaciones `mustBe`+`timing` alcanzables desde el editor son exactamente 3 (`approvedBefore`, `takeEither`, `takeConcurrent`). `mustBe: Taken` sin `timing` cae al default `Before` del evaluador, que el editor no ofrece: cualquier dato sembrado asi representa un estado no reproducible por el usuario. | D4 · evaluador + editor | S1 | refined | [RULE-curriculum-design-045](../rules/curriculum-design/rule-curriculum-design-045.md) (clausula 2) |
| L3 | Cuando un render ya resuelve un caso de lectura (aqui `collapseSingleVia` para la via unica del editor), el evaluador que alimenta a otro consumidor del mismo arbol necesita su propio equivalente: el contrato de datos no hereda las normalizaciones de la vista. | D1 | S1 | refined | [RULE-curriculum-design-046](../rules/curriculum-design/rule-curriculum-design-046.md) |

## Sessions

### Session 1 — 2026-07-31 — rama, validacion y commits de los dos bloques [phase: fix]

**Objetivo**: crear la rama desde `develop` actualizado, validar los dos bloques ya implementados y commitearlos por separado con su id externo respectivo.

**Tasks completadas**:

- [x] S1.T1: Crear rama `fix/UPONE-1378-prereq-missing-attribution` desde `develop` actualizado.
      `origin/develop` verificado 0 ahead / 0 behind antes de ramificar (sin stash: no hubo pull que aplicar) · los 9 archivos modificados viajan intactos a la rama.
      Rollback: `git checkout develop && git branch -D fix/UPONE-1378-prereq-missing-attribution` (los cambios vuelven a quedar sin commitear sobre develop).
- [x] S1.T2: Validar el estado del working tree antes de commitear.
      `npm test` 1442/1442 verde en 80 archivos · `npm run typecheck` 78 errores, **ninguno en los 9 archivos tocados** (deuda preexistente de TICKET-105, archivada; concentrada en `components/molecules/CalendarEventCard` 40, `BaseCard` 19, `composables/*`, `tests/unit/weightedSum.parity.test.ts`) · `npm run lint` no ejecutable (ESLint 8.57.1 hoisteado falla por incompatibilidad de `ajv` en `@eslint/eslintrc` antes de leer un solo archivo; ajeno al diff).
      Rollback: n/a (solo lectura).
- [x] S1.T3: Commit del bloque 1 (atribucion del faltante + opciones) atribuido a `UPONE-1378`.
      8 archivos, +270/-9 · → commit `e699e40`.
      Rollback: `git reset --soft HEAD~1`.
- [x] S1.T4: Commit del bloque 2 (label + timing del advisory del seed) atribuido a `UPONE-1456`.
      1 archivo, +11/-3 · → commit `fe26094`.
      Rollback: `git reset --soft HEAD~1`.
- [x] S1.T5: Neutralizar la redaccion de los comentarios introducidos (feedback del dev sobre estilo).
      Los comentarios deben describir el comportamiento implementado, no la conversacion que lo origino ni el changelog: se elimino la atribucion `feedback del dev` de la cabecera de `evaluateRequirementTree.logic.ts` y la narracion "Antes se reportaba…" del modulo, del spec y del seed, conservando la razon tecnica (el editor envuelve todo requisito en un `Group[OR]` de via unica; el render prefija el verbo derivado de `mustBe`) y las referencias de ticket, que si son convencion del repo ·
      Validado: 59/59 en los dos spec files del cambio · → commit `384d1c9`, pusheado al PR #34.
      Rollback: `git revert 384d1c9` (solo comentarios, sin efecto en runtime).

#### Commits

| Hash | Tasks | Mensaje | Archivos |
|------|-------|---------|----------|
| e699e40 | S1.T3 | UPONE-1378-S1 fix(mesh): attribute missing prereq to the failing node | evaluateRequirementTree.logic.ts, PrereqBlockModal.ts, CurriculumMeshElement.vue, lang/{es,en,pt}/common.i18n.json, evaluateRequirementTree.logic.spec.ts, prereqCheck.logic.spec.ts |
| fe26094 | S1.T4 | UPONE-1456-S1 fix(seed): canonical verb and explicit timing on the advisory rule | seed/_data-requirement.js |
| 384d1c9 | S1.T5 | UPONE-1378-S1 docs(mesh): describe the attribution rules without changelog framing | evaluateRequirementTree.logic.ts, evaluateRequirementTree.logic.spec.ts, seed/_data-requirement.js |

#### S1.GATE — 2026-07-31

- **Persistencia**: tasks + commits + TC registrados en este ticket. Tests de la sesion inline (DET-25).
- **Validacion (tier T1, fix acotado a un modulo)**: suite completa 1442/1442 (80 archivos) + los dos spec files del cambio re-corridos post-commit, 59/59. Working tree limpio en la rama.
- **Calidad (DET-23, light)**: sin `console.*` agregado · tipado sin `any` (el campo nuevo es `options?: string[]`) · CSS con tokens `var(--up1-*)` y fallback · i18n en las 3 locales (es/en/pt) · error-handling: guarda explicita del invariante `satisfied:false` con `missing` vacio · comentarios en espanol, codigo en ingles. Lint no verificable por el toolchain roto (ver S1.T2), no por el diff.
- **Runtime/UI (DET-36)**: `smoke-executed` **completo**. Ejecutado en UPU (localhost:3000, plataforma `uplanner/up1`, datos reales del tenant): **TC-08 pass** (label del advisory en el arbol), **TC-10 pass** (banner mesh-wide: `≥ 60 creditos` en vez de `Requisitos EST200`), **TC-11 pass** (modal con la lista de opciones, alta de GES110), **TC-12 pass** (modal con faltantes concretos y sin opciones, alta de QUI104). Ambas altas abortadas con Cancelar; `planEntry` del plan Civil sigue en 45 (cero escrituras, verificado en BD).
- **Como se desbloqueo el modo edicion** (primer intento fallido, dejado como aprendizaje): la malla exige layout `default_Curriculum_edit` + `Curriculum.status === 'Draft'` + rol con capabilities de edicion. El rol activo viaja al API en el header `X-Selected-Role` (`suite/plugins/apollo.client.ts`), tomado de `window.__SELECTED_ROLE_NAME__` y persistido en `localStorage.selectedRoleName`. Cambiar el rol por el selector y **recargar** (para que el header aplique desde el arranque) habilita todo con rol Admin; los `Authorization Error` del primer intento eran de requests emitidas antes de que el header cambiara, no una carencia de capabilities (Admin tiene 672, incl. `institution:view`, `up1_notification:view` y `planentry:*`).
- **Prerequisito del smoke**: `npm run sync --workspace=@uplanner/suite` para publicar la key i18n nueva a `suite/locales-dist/` (es/en/pt verificadas). Los componentes ya estaban sincronizados en `layout/src/modsComponents/CurriculumMesh/`.
- **Decision**: `continue` — queda el push/PR (accion que siempre pregunta) y el triage de learns (DET-39).

## Testing

| TC | Caso | Esperado | Actual | Evidence | Status | Session | Affects UI | Cambios gatillados |
|----|------|----------|--------|----------|--------|---------|-----------|--------------------|
| TC-01 | Via unica (`Group[OR]` con 1 hijo, como lo arma el editor) con la hoja no colocada | El modal nombra la hoja faltante, no el envoltorio | Nombra la hoja | `evaluateRequirementTree.logic.spec.ts` > "via unica (OR con 1 hijo, como lo arma el editor) → colapsa y nombra la hoja faltante" — verde post-commit | pass | S1 | yes | — |
| TC-02 | AND implicito `{A,B}` con solo A colocado antes | Reporta `RecordState B`, no `Group "1 de 2"` | Reporta `RecordState QUI100` | `prereqCheck.logic.spec.ts` > "Group sin minToSatisfy explicito → default es el total de miembros (AND implicito)" (expectation actualizada) + `evaluateRequirementTree.logic.spec.ts` > "AND{A,B}, solo A colocado antes → viola y atribuye el faltante a B, no al grupo" — verde | pass | S1 | yes | Contrato de salida cambiado respecto de TICKET-101 S7 (registrado en Summary) |
| TC-03 | K-de-N (`minToSatisfy=1`) con 2 miembros faltantes | Reporta el grupo con `options: [miembro1, miembro2]` resueltos por `labelResolver` | `options: ['ING100','FRA100']` | `prereqCheck.logic.spec.ts` > "Group con 0 de 2 miembros colocados antes, minToSatisfy=1 → falta con detalle y con las opciones" + `evaluateRequirementTree.logic.spec.ts` > "K-de-N: las opciones son los miembros faltantes, resueltos por labelResolver" — verde | pass | S1 | yes | — |
| TC-04 | Alternativa con una sola rama faltante | Sin `options` (no hay eleccion que ofrecer) | Sin `options` | `evaluateRequirementTree.logic.spec.ts` > "una sola rama faltante en una alternativa → sin `options`" — verde | pass | S1 | yes | — |
| TC-05 | Rama compuesta con parte ya satisfecha | La descripcion de la opcion omite lo cumplido | Omite lo cumplido | `evaluateRequirementTree.logic.spec.ts` > "la descripcion de una rama omite lo YA satisfecho (no lo vuelve a pedir)" — verde | pass | S1 | yes | — |
| TC-06 | Grupo con `creditsRequired` propio no alcanzado | Reporta el grupo con el detalle del umbral, no desciende | Reporta el umbral | `evaluateRequirementTree.logic.spec.ts` > "AND con umbral de creditos: nombra el umbral con su detalle, no el contenedor" — verde | pass | S1 | yes | — |
| TC-07 | Invariante del modal | Nunca `satisfied:false` con `missing` vacio | Invariante sostenida | `evaluateRequirementTree.logic.spec.ts` > "nunca devuelve satisfied=false con missing vacio (invariante del modal)" — verde | pass | S1 | no | Guarda explicita en `evaluateGroup` |
| TC-08 | Nodo advisory del seed renderizado en el arbol (tab Requisitos de `C-ESTADISTIC-107`, UPU) | Se lee el verbo una sola vez, condicion como badge, sin "(advisory)" ni verbo duplicado | `Cursar Fundamentos de Programacion` + badges `Cursado · Antes o concurrente` y `Recomendado`. Resumen en prosa: "… Y Creditos ≥ 60 Y Cursar Fundamentos de Programacion" | **smoke runtime ejecutado** en UPU (localhost:3000, rol Consultor, plan/actividad reales): texto extraido del DOM vivo del arbol renderizado | pass | S1 | yes | — |
| TC-10 | Atribucion del faltante en el **banner mesh-wide** (superficie de solo lectura del MISMO evaluador): `Requisitos EST200` = Group AND puro {Via de ingreso (satisfecha), ≥60 creditos (falla), advisory} | Nombra la condicion que falla (`≥ 60 creditos`), NO el contenedor (`Requisitos EST200`) | `1 asignatura(s) tienen requisitos sin cumplir en su periodo actual. Es un aviso; no bloquea la edicion. C-ESTADISTIC-107 — Estadistica (periodo 3): ≥ 60 creditos` | **smoke runtime ejecutado** en UPU, malla de `UPU-LMAT-PLAN-2026`: Estadistica en periodo 3 con 48 creditos previos (< 60) y Calculo I/Algebra Lineal en periodo 1 (via satisfecha). Antes del fix este banner decia `Requisitos EST200` | pass | S1 | yes | Es la unica superficie runtime de la atribucion accesible sin modo edicion |
| TC-11 | Lista de `options` en `PrereqBlockModal`: alta de `GES110` en periodo 1 del plan Draft `UPU-ICIV-PLAN-2026` (or de via unica → and puro → pool K-de-N 2 de 3 + umbral de creditos) | Dos faltantes concretos (NO "Cualquiera de las vias"); el pool con "Se cumple con cualquiera de estas opciones:" + 3 ramas; el umbral con su propio detalle | `≥ 60 creditos` / "0 de 60 creditos acumulados antes del periodo 1" · `Electivo de especializacion (2 de 3)` / "0 de 2 cursos colocados antes del periodo 1" + `Se cumple con cualquiera de estas opciones:` → `C-TOPOGRAFIA-023 — Topografia`, `C-GEOLOGIAAP-024 — Geologia Aplicada`, `C-MATERIALES-025 — Materiales de Construccion` | **smoke runtime ejecutado** en UPU con rol Admin, malla en `Modo edicion`: texto extraido del DOM vivo (`.pbm-list`, `.pbm-list__options-label`, `.pbm-list__option`). Alta abortada con Cancelar: `planEntry` del plan sigue en 45, cero escrituras | pass | S1 | yes | — |
| TC-12 | Faltantes concretos SIN opciones: alta de `QUI104` en periodo 1 del mismo plan (or de via unica → and puro {prereq Before, correquisito Concurrent}) | Dos condiciones concretas nombradas por curso, cada una con el detalle de SU timing, y `options` ausente | `C-CALCULOIII-011 — Calculo III` / "No colocado en el mismo periodo o antes" (Concurrent) · `C-METODOSNUM-018 — Metodos Numericos` / "No colocado en un periodo anterior" (Before) · `.pbm-list__options-label` **ausente** | **smoke runtime ejecutado** en UPU, mismo flujo. Alta abortada con Cancelar, cero escrituras | pass | S1 | yes | — |
| TC-09 | Regresion del flujo de alta con prerrequisitos | El modal sigue bloqueando el alta cuando falta un requisito duro | Sin regresion a nivel unit | Suite completa 1442/1442 (80 archivos), incl. `findMissingPrereqsForBatch` (alta masiva todo-o-nada, dedup por refId+type) y los component specs de AddEntryModal/EditEntryModal | pass | S1 | yes | Cobertura unit; el path real de la UI queda cubierto por TC-08 |

## Teaching — Intake

**Status**: skipped
**Razon**: el trabajo ya estaba implementado en el working tree al crear el ticket (registro retroactivo), asi que no habia un "hacia adelante" que orientar: el contexto necesario quedo inline en Request + KB consulted + Discoveries. `teach_policy: skip` (opt-out explicito del dev, HOR-106).
**Archivo**: (no generado)

## Teaching — Close

**Status**: skipped
**Razon**: opt-out explicito del dev el 2026-07-31 (`teach_policy: skip`, HOR-106). Fix acotado a un modulo; el conocimiento nuevo se promovio a [RULE-curriculum-design-045](../rules/curriculum-design/rule-curriculum-design-045.md) y [RULE-curriculum-design-046](../rules/curriculum-design/rule-curriculum-design-046.md), que es el canal durable y consultable por KB-first (DET-11). El flujo de la session y la evidencia del smoke quedan en Sessions + Testing + Summary.
**Archivo**: (no generado)

## Summary

Pendiente de cierre. Estado al 2026-07-31:

**Que se hizo** (S1):

- Rama `fix/UPONE-1378-prereq-missing-attribution` creada desde `develop` (0/0 vs `origin/develop`).
- `e699e40` (UPONE-1378): atribucion del faltante en el evaluador + `options` en el contrato + render de las opciones en el modal + CSS + key `curriculumMesh.prereqBlock.options` en es/en/pt + 7 tests nuevos y 3 expectations actualizadas.
- `fe26094` (UPONE-1456): label del advisory del seed al verbo canonico (`Cursar X`) + `timing: 'Either'` explicito.

**Smoke runtime ejecutado** (2026-07-31, UPU en localhost:3000):

- TC-08 **pass**: el arbol de requisitos de `C-ESTADISTIC-107` muestra `Cursar Fundamentos de Programacion` con badges `Cursado · Antes o concurrente` + `Recomendado`. Verbo una sola vez, sin "(advisory)" en el label.
- TC-10 **pass**: el banner mesh-wide de `UPU-LMAT-PLAN-2026` nombra `≥ 60 creditos` (la condicion que falla) en vez de `Requisitos EST200` (el contenedor). Es la atribucion del fix vista en runtime, en una superficie de solo lectura.
- TC-11 **pass**: alta de `GES110` en periodo 1 del plan Draft `UPU-ICIV-PLAN-2026` (rol Admin, malla en Modo edicion). El modal lista `≥ 60 creditos` y `Electivo de especializacion (2 de 3)` con "Se cumple con cualquiera de estas opciones:" + las 3 ramas. Ninguna mencion de "Cualquiera de las vias".
- TC-12 **pass**: alta de `QUI104` en el mismo periodo. El modal nombra `Calculo III` ("No colocado en el mismo periodo o antes", correquisito) y `Metodos Numericos` ("No colocado en un periodo anterior"), sin lista de opciones.
- Ambas altas se abortaron con Cancelar; el plan sigue con 45 `planEntry` (cero escrituras, verificado en BD).

**Push + PR**: rama pusheada a `origin/fix/UPONE-1378-prereq-missing-attribution` (el hook pre-push marco el typecheck preexistente como advisory, no bloqueo). **PR #34 ABIERTO**: https://bitbucket.org/uplanner/curriculum-design/pull-requests/34 (`fix/UPONE-1378-prereq-missing-attribution` -> `develop`, `close_source_branch: true`). Descripcion con los dos bloques, la validacion y las notas de typecheck/lint preexistentes.

**Cierre (2026-07-31)**:

- **Learns procesados (DET-39)**: los 3 raw promovidos. L1 + L2 → [RULE-curriculum-design-045](../rules/curriculum-design/rule-curriculum-design-045.md) (verbo canonico en el label + `timing` explicito alcanzable desde el editor). L3 → [RULE-curriculum-design-046](../rules/curriculum-design/rule-curriculum-design-046.md) (las normalizaciones del render no las heredan los otros consumidores del arbol). Cero raw pendientes.
- **Teach (DET-22)**: `teach_policy: skip`, opt-out explicito del dev (HOR-106). Razon en el frontmatter: el conocimiento nuevo vive en las 2 rules.
- **Story points**: `executed: 2` (1 session).
- **Fuera de alcance, queda en manos del team**: review y merge del PR #34. El ticket cierra con el PR abierto por decision del dev; si el review pide cambios, se reabre con nueva session (no se re-escribe el request, DET-3).
- **Deuda preexistente NO tocada**: 78 errores de `vue-tsc` en archivos ajenos (deuda archivada en TICKET-105) y el ESLint del monorepo roto por `ajv`.
3. **Triage de los learns L1/L2/L3** (DET-39): promover a rule de `curriculum-design` o descartar.
4. Registrar `story_points.executed`.
