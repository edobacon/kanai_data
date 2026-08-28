---
id: DOC-kb-sp5-deltas-transcript-vs-mockup
project: up1
type: doc
---

# SP5 — Deltas transcript vs. mockup v10 + decisiones de componente UI

> **Propósito.** El `mockup_v10.html` es la referencia visual, pero la **reunión (transcript) corrigió o detalló comportamientos que la maqueta no cubría o resolvió mal**. Este documento registra esos deltas y las **decisiones de componente** (qué reusar de up1, qué construir), para que estén claros **al comenzar el sprint** y el dev no implemente la maqueta literal donde el transcript ya la superó.
> **Fuentes:** `sources/mockup_v10.html`, `sources/reunion-inicio-sprint_2026-06-23.pdf` (`00:17:02`–`00:28:18`), `decisiones-reunion_2026-06-23.md` §3.1.
> **Fecha:** 2026-06-23.

---

## 1. Delta principal: flujo de bloque electivo (crear nuevo vs. seleccionar existente)

| Aspecto | Mockup v10 | Transcript (decisión) | Acción |
|---|---|---|---|
| Selector de bloque | `<datalist>` HTML crudo (placeholder de maqueta) | **Select-suggest**: elegir bloque existente **o** crear/nombrar uno nuevo | Usar componente real de up1 (ver §3) |
| Visibilidad de bloques | **Inconsistente**: no se veían los bloques existentes hasta seleccionar una asignatura (`00:17:02`) | El selector de bloque debe ofrecer los bloques del plan **antes/independiente** de elegir cursos | Corregir el orden del flujo en B5 |
| Semántica de la acción | Parecía "editar el bloque" | **Tagging**: se crean `planEntry` con `blockId`; el bloque **se crea/crece como consecuencia**, no se edita directo (`00:22:41`, `00:25:45`) | B5 modela tagging, no edición de bloque |
| Bloque existente | No contemplado | Al elegir un bloque existente, **precargar sus cursos actuales** para sumar/quitar (`00:24:35`) | Agregar a B5 |
| `minToSatisfy` (N de K-de-N) | No contemplado | **Auto-derivado del conteo** de cursos del bloque (default = total; ajustable) (`00:28:18`) | Lógica en B5/A4 |
| Owner del bloque | Implícito | `requirement(Group, ownerType=curriculum, OR)` — todos los bloques cuelgan del currículum (`00:26:58`) | Modelado en A3/A4 |

## 2. Otros deltas (mockup incompleto o superado)

| # | Delta | Mockup | Transcript | Acción |
|---|---|---|---|---|
| D-1 | **Input del nombre del bloque** | Faltaba el input de texto del `label` ("el label no lo tengo como un input de texto", `00:18:24`) | El `requirement.label` = nombre del bloque, requiere input de texto en el form | B5: incluir input de label |
| D-2 | **Picker oculta cursos ya agregados** | La lista mostraba todo el catálogo | Las asignaturas ya colocadas en la malla **desaparecen** del picker ("si ya agregué cálculo uno, no debería estar en la lista", `00:26:58`) | B4: filtrar del picker los `Activity` con `planEntry` en el plan |
| D-3 | **Créditos mínimos NO alertan** | La maqueta sugería alertar por requisitos | El requisito `MetricThreshold(Credits)` **no dispara** el bloqueo al agregar (`00:29:22`); solo alertan cursos (`RecordState Before`) y K-de-N de cursos | B6: criterio explícito |
| D-4 | **Línea de formación ⟂ bloque** | La maqueta los mostraba juntos | El bloque es un OptionPool con **nombre propio independiente de la línea** (`00:20:02`); un entry puede tener `categoryId` **y** `blockId` | A1/B5: ejes ortogonales |
| D-5 | **Color/ícono de la línea** | Mostrados directo | Se manejan con el componente **`view`** del formulario (Eduardo confirmó factibilidad, `00:03:22`); puede simplificarse a solo nombre si es complejo | C2: usar `view`; decisión §5.2 del plan |

## 3. Decisión de componente: select-suggest — **REUSAR, no construir** ✅

**Pregunta:** ¿up1 tiene un select con autocompletado + crear-nuevo (suggest), o hay que construirlo?

**Respuesta (verificado en código):** up1 **ya lo tiene** de forma nativa vía **Vueform**. No se construye nada nuevo.

- **`SelectElement` / `TagsElement` con `search: true` + `create: true`** — combo de autocompletar + crear-opción-desde-texto-tipeado. Evidencia de uso real:
  - `layout/src/components/organisms/Modal/AllInputsModal/AllInputsModal.vue:265-266` (`search: true, create: true`).
  - `layout/src/composables/useRecordTypeResolver.ts:105`, `layout/src/layouts/RecordDetail.vue:1973,2796` (`search: true`).
- **Opciones remotas** (los bloques `requirement(Group)` del plan): poblar con el patrón **`useOwnerIdOptions`** (`mods/curriculum-design/modsComposables/useOwnerIdOptions.ts`) — `autoPopulate` + `passApolloClient` consultando `listInstances`. Filtrar por `ownerType=curriculum`, `ownerId=<plan>`, `recordType=Group`.

**Mapeo al flujo de B5:**
- Selector de bloque = `SelectElement` con `search: true` (autocompletar bloques existentes del plan) + `create: true` (nombrar un bloque nuevo tipeando) + opciones remotas vía composable.
- El valor seleccionado existente → `blockId` del Group; un valor "creado" → se crea el `requirement(Group)` y se usa su id.

**⚠️ Nota de integración (no es construir, es integrar):** el componente de malla son **modales caseros** (átomo `Modal`), no formularios Vueform completos (por BUG-platform-011, ver `auditoria-viabilidad` H-6, igual que `CompositeSectionTree`). Por lo tanto, para el selector de bloque hay que **embeber el `SelectElement` de Vueform dentro del modal casero** (mini-form Vueform de un campo) o usar la molécula `Select-vueform`/`Multiselect-vueform` (`layout/src/components/vueform/molecules-vueform/`). Es **reuso + integración** (parte del esfuerzo de B5), no desarrollo de un autocompletar desde cero. Validar el render del `SelectElement` standalone dentro del modal casero como primer paso de B5.

## 4. Confirmación para la auditoría

- **C-11 (nuevo):** el patrón select-suggest (autocompletar + crear) **existe** en up1 (Vueform `search`+`create`); las opciones remotas se pueblan con `useOwnerIdOptions`. **No se construye componente nuevo**; el riesgo es de integración en el modal casero (bajo, con precedente `CompositeSectionTree`).

---

## 5. Checklist de registro (para arrancar el SP con esto claro)

- [x] Flujo bloque electivo (crear/seleccionar) documentado en `decisiones-reunion` §3.1 y en B5.
- [x] Input de nombre de bloque (label) → B5.
- [x] Picker oculta cursos ya agregados → B4.
- [x] Créditos mínimos no alertan → B6.
- [x] Línea ⟂ bloque (ortogonales) → A1/B5.
- [x] Componente select-suggest: reusar Vueform `search`+`create` + `useOwnerIdOptions`; integrar en modal casero → nota en B5.
