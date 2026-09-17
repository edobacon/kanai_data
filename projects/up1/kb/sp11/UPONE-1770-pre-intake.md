---
id: DOC-kb-sp11-UPONE-1770-pre-intake
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp11
  - curriculum-mapping
  - pre-intake
  - UPONE-1770
  - tributacion
  - pesos
---

# UPONE-1770-pre-intake

> ⚠️ **SUPERADO EN PARTE (2026-09-15) - leer con `UPONE-1770 - cierre de alcance y correcciones` (sp11).** Correcciones que afectan a esta guia: **(1)** la fila "Malla" NO es reuso del `CurriculumMesh` de curriculum-design: la vista "Por malla" es un modo interno de tributacion (cm ya lee `planEntry` por periodo). **(2)** El "Guard suma al publicar" (D1) sale de 1770 a ticket aparte (cross-mod verificado). **(3)** R-9 (gate por institucion) queda fuera: es legacy, no existe en up1. La "Recomendacion de particion" de abajo queda obsoleta en su parte cross-mod. Ver el cierre.

> **Copia en sp11** de la guia de implementacion de UPONE-1770. El original queda tambien en sp10. Contenido identico.

> Guia de implementacion (el COMO) para UPONE-1770. Material human-read, no va a Jira. El que-conseguir esta en `UPONE-1770-detalle`; la frontera en `UPONE-1770-aduana`.

## Mapa de piezas y donde vive cada una

| Pieza | Repo/archivo de enganche | Patron a copiar |
|---|---|---|
| Upsert de conjunto (batch) | `logic/competencyAlignment.resolver.js` (+ nuevo resolver/mutation) | `logic/competencyTree-upsert.resolver.js` (reemplazo total, `runInTransaction`) |
| Gobernar el peso | `logic/helpers/validateCompetencyAlignment.js` (`WRITABLE_FIELDS`) + resolver | ninguno (agregar campo + validacion) |
| Reparto en partes iguales | cliente (`weights.ts`) | G-6 (ya es client-side) |
| Via masiva | resolver del mod | `logic/matrixAdoption.resolver.js:246-300` (troceo backend, AD-12) |
| Vista Por malla (cm-interno) | tributacion, con `planEntry` por periodo (`alignmentView.resolver.js`) | modo de vista propio, NO `CurriculumMesh` de cd |
| ~~Guard suma al publicar~~ **(D1, fuera de 1770)** | `curriculum-design/logic/curriculum-update.resolver.js` | `logic/helpers/assertPublishable.js` |

## Decisiones tecnicas y enfoques

### 1. Upsert de conjunto: reemplazo total vs delta

- **A. Reemplazo total (recomendado).** El cliente manda el mapa completo por `(planId, matrixId)`; el resolver reconcilia (crea, actualiza, retira lo que no vino) en una transaccion. Pros: consistente con `upsertCompetencyTreeValidated` y con la barra "Guardar" de la maqueta; una sola entrada de historial; el estado del grupo se recalcula sobre el conjunto. Contras: hay que definir el **scope de borrado** con cuidado (que se considera "ya no vino": por matriz, por plan, por celda) para no retirar tributaciones fuera de la vista cargada. Mitigacion: acotar el reemplazo al `(planId, matrixId)` que el cliente declara, nunca a todo el plan.
- **B. Batch de operaciones (add/update/remove explicitos).** El cliente manda una lista de operaciones. Pros: sin riesgo de borrado implicito. Contras: se aleja de la semantica "sesion de trabajo / guardar todo" que pide el PO y duplica logica que la grilla ya hace por fila.
- **Hipotesis a validar:** que `competencyAlignmentView` devuelve exactamente el conjunto que el cliente reenvia (mismas filas), para que "lo que no vino = retirar" sea seguro.

### 2. Peso del eje 1

- Agregar `contributionPercentage` a `WRITABLE_FIELDS` y a la validacion del resolver. El campo es **string** a proposito (no truncar decimales): validar formato numerico 0-100.
- **Reparto en partes iguales: client-side** (G-6 ya lo fija asi). El servidor no reparte; solo valida.
- **R-6:** solo `Evaluates` y `Both` entran al grupo de peso. `Develops` no pondera. El grupo se arma por `(planId, competencyNodeId, developmentLevelId)` (el indice que dejo 1769).
- **Estado auto/manual derivado:** no persistir. Grupo automatico = pesos iguales dentro de tolerancia.

### 3. Vista "Por malla" (cm-interno)

- Es un modo de vista de la propia pantalla de tributacion: las asignaturas del plan por periodo. Se dibuja con `planEntry` que el mod ya lee (`alignmentView.resolver.js` trae codigo, nombre, `period`, `position`). **No** importar `CurriculumMesh` de curriculum-design (M-26).

### 4. Via masiva

- Aplicar un destino (nivel + tipo) a varias asignaturas de una vez. Troceo del lote en el backend (AD-12, `matrixAdoption.resolver.js`).

## Orden sugerido (riesgos primero)

1. Upsert de conjunto (define el contrato de guardado y el mayor riesgo tecnico).
2. Gobernar el peso + R-6 + estado derivado (sobre el conjunto ya guardado).
3. Via masiva (reusa el patron bulk).
4. Vista Por malla (modo de vista sobre los mismos datos).

> Nota: la validacion "suma 100 al publicar el plan" (D1) NO es de 1770 (ticket cross-mod aparte). R-9 (gate por institucion) queda fuera (legacy). Ver el cierre.
