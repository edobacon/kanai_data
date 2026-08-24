# Requisitos: forma del seed vs. forma creada desde la UI

> El árbol de "Requisitos" de una Activity se ve distinto según haya sido sembrado por seed o
> creado a mano desde el editor. La causa es que **el seed persiste una forma que el flujo de
> creación de la UI no sabe reproducir hoy**. Este doc registra el hallazgo para revisar el seed
> y acomodarlo a la realidad actual del sistema (o, alternativamente, habilitar esa forma en la UI).
>
> **Fecha:** 2026-08-04 · **Base:** código verificado en `uplanner/up1/mods/curriculum-design`
> (seed + `RequirementEditor` + `ReglaUnificadaView`).

## TL;DR

No es un bug de render. El editor (`RequirementEditorElement.vue`) dibuja fielmente el árbol que
hay en BD. Lo que difiere es la **forma persistida**: el seed y el flujo de creación desde la UI
generan estructuras distintas, y el flujo de la UI **no puede producir** la forma del seed. Por eso
editar el árbol sembrado y armar uno nuevo dan resultados visualmente distintos.

## Cómo se detectó

Comparando dos registros Activity (ambos "Estadistica"):

- **Seed** (EST200, owner `C-ESTADISTIC-107`): `5 condición(es) — 2 vía(s)`.
- **Creado desde 0**: `2 condición(es) — 2 vía(s)`.

Son **dos registros distintos**, no el mismo visto de dos modos.

## Las 3 diferencias y su causa

### 1. Nivel de anidación (estructural — la de fondo)

| Origen | Raíz | Contenedor de vías | Condiciones globales |
|--------|------|--------------------|----------------------|
| **Seed** | `Group[AND]` "Requisitos EST200" | `Group[OR]` "Vía de ingreso" **anidado un nivel** bajo el AND | `≥ 60 créditos`, advisory "Cursar..." colgando directo del AND raíz |
| **UI (crear desde 0)** | `Group[OR]` "Cualquiera de las vías" **directo en la raíz** (`parentId: null`) | el mismo OR raíz | ninguna (la UI no las crea) |

- Seed: `seed/_data-requirement.js:97-143`
- UI: `modsComponents/RequirementEditor/requirementCreate.logic.ts:57-83` (`ensureOrContainer` siempre crea el OR en la raíz)

`findViaContainer` (`requirementEditor.logic.ts:69-77`) hace BFS y encuentra el OR esté donde esté,
por eso ambas formas "funcionan". Pero el árbol visual conserva la jerarquía real, así que el seed
muestra **2 niveles de más** (wrapper AND + OR nombrado) que la UI nunca genera.

**El punto clave:** el flujo de creación de la UI **solo sabe armar el OR en la raíz**. La forma del
seed (AND raíz + OR anidado + condiciones globales sueltas) es un caso más rico que un usuario **no
puede reproducir** editando desde el editor.

### 2. Labels de los nodos de agrupación (cosmético)

| Origen | Label del OR | Label de la vía (AND) |
|--------|--------------|-----------------------|
| **Seed** | "Vía de ingreso" | "Cálculo + Álgebra" (autorado a mano) |
| **UI** | "Cualquiera de las vías" | "Todos de la vía" (defaults de `ContainerLabels`) |

El badge "Vía N" se calcula igual en ambos; lo que cambia es el **texto propio** del nodo.

### 3. Badges de las condiciones hoja (dato faltante)

| Origen | Campos poblados | Cómo se ve |
|--------|-----------------|-----------|
| **Seed** | solo `mustBe: 'Approved'` (sin `timing` ni nota mínima) | `[Aprobado][Obligatorio]` |
| **UI** | `mustBe`, `timing: 'Before'`, `minGrade` | `[Aprobado · Antes][nota mínima 11]` |

Seed: `seed/_data-requirement.js:113-125`. Es puro dato: el seed no pobló esos campos opcionales;
el formulario de la UI sí los pide y setea.

## Diagnóstico

- **#2 y #3** son de contenido (labels y campos que el seed dejó en blanco): cosméticos.
- **#1** es la estructural de fondo: el seed usa una forma que la UI no puede generar. Un usuario que
  edita el árbol sembrado ve algo distinto a uno que arma uno nuevo, y no tiene forma de llegar a la
  forma del seed desde el editor.

Nada de esto rompe el editor ni el evaluador (ambos leen las dos formas con fidelidad).

## Qué revisar del seed

Acomodar el seed a lo que el sistema sabe manejar hoy desde la UI. A decidir por el dev:

- **Aplanar la estructura #1** a la forma canónica de la UI: `Group[OR]` en la raíz, sin AND wrapper.
  **Tradeoff:** se pierde la cobertura del caso "OR anidado bajo AND raíz + condiciones globales
  sueltas", que hoy solo existe en el seed EST200 y ejercita `findViaContainer` en su rama BFS
  profunda y `deriveVias` con condiciones globales fuera de vías. Si se aplana, conviene cubrir ese
  caso con un test de integración para no perderlo.
- **Alinear labels #2** a los defaults de `ContainerLabels` (o dejar los autorados si aportan al ejemplo).
- **Poblar `timing`/nota mínima #3** en las hojas del seed para que el ejemplo se vea igual a uno
  creado a mano (o dejarlas mínimas a propósito si el caso "solo Aprobado" es intencional).

**Pregunta abierta de fondo:** si la forma anidada del seed es un caso válido que el sistema debería
soportar, la alternativa a aplanar el seed es **habilitar en la UI** la creación de esa estructura
(AND raíz + condiciones globales). Definir cuál de las dos realidades es la correcta antes de tocar
el seed — aplanar el seed sin resolver esto solo esconde que el editor no soporta esa forma.

## Archivos relevantes

- `seed/_data-requirement.js` — forma que persiste el seed.
- `modsComponents/RequirementEditor/requirementCreate.logic.ts` — forma que persiste la UI al crear.
- `modsComponents/RequirementEditor/requirementEditor.logic.ts` — `findViaContainer`, `deriveVias`, `collapseSingleVia`, `pruneEmptyGroups`.
- `modsComponents/ReglaUnificadaView/buildRequirementTree.logic.ts` — flatten de la proyección RT + ensamblado por `parentId`.
