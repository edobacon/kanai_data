---
id: DOC-kb-sp5-prespecs-MC-06
project: up1
type: doc
---

# Pre-spec MC-06 — Malla: agregar y editar asignaturas (obligatorias + electivas)

> Borrador de spec + intake para **MC-06** (agrupa B4 + B5 + B7). Referencia en `sp5/`, no record DKC.
> **Épica:** B (malla · FE) · **Tier:** 🅼 Must (electivas 🆂 Should) · **SP:** 8 · **Repo:** `up1/mods/curriculum-design`

---

## 1. Intake
- **KB:** modales **caseros** (átomo `Modal`) por BUG-platform-011 (el `ModalStackManager` no se expone a Vueform elements) — patrón `CompositeSectionTree`. El **select-suggest** (bloque electivo) **se reusa, no se construye**: Vueform `SelectElement` con `search:true`+`create:true` + opciones remotas vía `useOwnerIdOptions` (ver `deltas-transcript-vs-mockup.md §3`).
- **Necesidad/reuso (DET-32):** modales y flujos = build; select-suggest = **reuse** (Vueform nativo); picker de catálogo = build sobre `listInstances` de Activity.
- **Supuestos / deltas del transcript que la maqueta no cubría:** flujo obligatoria simple vs electiva con bloque; tagging (no edición de bloque); picker oculta agregados; `minToSatisfy` auto-derivado; label = input de texto.

## 2. Requisitos (REQ)

### REQ-01 · Modal de alta en 2 pasos
**Certeza:** `confirmed` · **source_ref:** reunión `00:04:49`/`00:06:10` + mockup 763–817

**DEBE** ser un modal de 2 pasos: Paso 1 = tipo (Obligatoria/Opcional); Paso 2 = picker de `Activity` (buscar + filtro por departamento + multiselección).

### REQ-02 · Flujo obligatoria + línea en masa
> **Qué cambia:** al agregar obligatorias se puede fijar UNA línea para todo el lote. **Por qué:** evita asignar línea curso por curso (engorroso con 10+).

**Certeza:** `confirmed` · **source_ref:** reunión `00:39:19`/`00:40:25`

En el Paso 1 (Obligatoria) **DEBE** poder elegirse una **línea de formación opcional aplicada en masa** a todos los cursos seleccionados. Crea `planEntry` (kind=Course) **sin** `blockId`, con `categoryId` (si se eligió línea) y créditos heredados.

### REQ-03 · Picker oculta cursos ya agregados
**Certeza:** `confirmed` · **source_ref:** reunión `00:26:58`

El picker **DEBE** excluir las `Activity` que ya tienen `planEntry` en el plan ("van desapareciendo las que ya agregué"). Muestra/filtra cursos `isCurrent`.

### REQ-04 · Filtro por departamento
**Certeza:** `confirmed` · **source_ref:** reunión `00:06:10` (unidad organizacional)

El picker **DEBE** filtrar por departamento = `Activity.executionUnitId` → `OrgUnit` (objeto del mod `uengagement-up1`, cross-mod).

### REQ-05 · Flujo electiva: bloque existente o nuevo (select-suggest)  *(🆂 Should)*
> **Qué cambia:** al elegir Opcional se asigna a un bloque con nombre, eligiendo uno existente o creando uno. **Por qué:** corrige la inconsistencia del mockup (no se veían bloques hasta elegir asignatura).

**Certeza:** `confirmed` · **source_ref:** reunión `00:17:02`/`00:22:41` + `deltas §1`

**DEBE** permitir **seleccionar un bloque existente del plan o crear/nombrar uno nuevo** (select-suggest: Vueform `search`+`create`, opciones de `requirement(Group, ownerType=curriculum)` del plan vía `useOwnerIdOptions`).

### REQ-06 · Tagging, no edición del bloque  *(🆂 Should)*
**Certeza:** `confirmed` · **source_ref:** reunión `00:22:41`/`00:25:45`

La acción **DEBE** ser tagging: crear `planEntry` con `blockId`; el bloque **se crea/crece como consecuencia**, no se edita directo. El bloque es **independiente de la línea** (un entry puede tener `categoryId` Y `blockId`).

### REQ-07 · Precarga de bloque existente + `minToSatisfy` auto  *(🆂 Should)*
**Certeza:** `confirmed` · **source_ref:** reunión `00:24:35`/`00:28:18`

Al elegir un bloque existente **DEBE** precargar sus cursos (sumar/quitar). El `minToSatisfy` (N de K-de-N) **DEBE** auto-derivarse del conteo de cursos del bloque (default = total; ajustable). El `label` del bloque se captura con **input de texto** (delta `00:18:24`).

### REQ-08 · Editar / quitar un `planEntry`
**Certeza:** `confirmed` · **source_ref:** handoff MC-CMP-7 + mockup 837–862

Modal flotante **DEBE** permitir: créditos (override), línea (categoría), Rol (Obligatoria/Electiva→bloque), "Quitar de la malla". Rol→Electiva setea `blockId`; →Obligatoria lo limpia; cambiar categoría **no** afecta la electividad.

## 3. Tasks (con rollback)
| # | Task | Rollback |
|---|---|---|
| T1 | Modal 2 pasos (casero) — paso 1 tipo+línea, paso 2 picker (REQ-01,02,04) | quitar modal |
| T2 | Picker: query Activity + filtro depto + exclusión de agregados + `isCurrent` (REQ-03,04) | revertir |
| T3 | Lógica de alta obligatoria → planEntries (REQ-02) en `.ts` + `.spec.ts` | revertir |
| T4 | Select-suggest de bloque (Vueform search+create + `useOwnerIdOptions`); validar render en modal casero (REQ-05) | quitar selector |
| T5 | Tagging electivo: crear/crecer bloque, precarga, minToSatisfy auto, label (REQ-06,07) | revertir |
| T6 | Modal editar/quitar (REQ-08) | quitar modal |

## 4. Test cases
| TC | REQ | Caso | Esperado |
|---|---|---|---|
| TC-01 | REQ-02 | agregar 3 obligatorias con línea "Núcleo" al período 1 | 3 planEntry, period=1, categoryId=Núcleo, sin blockId, créditos heredados |
| TC-02 | REQ-03 | abrir picker con MAT110 ya en la malla | MAT110 no aparece en la lista |
| TC-03 | REQ-05 | electiva → elegir bloque existente "Electivo Esp." | planEntry con blockId del Group existente |
| TC-04 | REQ-05 | electiva → nombrar bloque nuevo "Electivo X" | se crea requirement(Group, OR, ownerType=curriculum) + planEntry tagueado |
| TC-05 | REQ-07 | agregar 4 cursos a un bloque nuevo | minToSatisfy = 4 (auto) |
| TC-06 | REQ-08 | cambiar Rol de un entry a Electiva | setea blockId; badge electivo aparece |
| TC-07 | REQ-08 | cambiar categoría de un entry electivo | sigue electivo (blockId intacto) |

## 5. Dependencias
- **Depende de:** MC-02 (planEntry) + MC-03 (requirement Group, A4) + MC-05 (componente base).
- **Patrón:** `CompositeSectionTree` (modales caseros); `AllInputsModal.vue:265` (search+create); `useOwnerIdOptions`.

## Restricción de arquitectura y tests (TICKET-085 · DEC-038 · RULE-mods-051)

> Aplica al tomar este ticket. Fuente: pedido del dev (agnosticismo + tests) sobre el componente de malla.

- **Seam presentacional/adapter (DEC-038, opción A "seam ahora, extraer luego")**: la lógica de dominio nueva va al **adapter** (`CurriculumMeshElement.vue` + `.ts`), NO a las primitivas de render (grid/columna/tarjeta-shell/summary-bar). El contenido de tarjeta se inyecta por **slot** y las acciones se exponen por **evento/callback** — los primitivos no ejecutan mutations del dominio. Objetivo: que el core presentacional quede extraíble a un `GroupedCardBoard` genérico cuando haya un 2º consumidor (no extraer ahora — DET-32).
- **Lógica pura testeable (refuerza RULE-cd-014)**: toda lógica nueva (alta → planEntries, checker de prereqs K-de-N, resaltado de filtros, recálculo `period`/`position`, derivaciones electivas) vive en `.ts` con `.spec.ts` y asserts concretos.
- **Tests de interacción en tasks UI (gap a cubrir)**: las tasks de modales (alta/edición), picker y drag&drop DEBEN incluir tests de interacción/componente, no sólo el `.spec.ts` de la lógica pura. Sin esto el quality gate (DET-23 dim. testing) queda corto.
- **No hornear dominio en el core**: ningún identificador curricular (planEntry, blockId, créditos, status, requirement) debe aparecer en las primitivas de render — sólo en el adapter/lógica. Verificación: grep en las primitivas.
