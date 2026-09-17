---
id: DOC-kb-sp10-UPONE-1770-pre-intake
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp10
  - curriculum-mapping
  - pre-intake
  - UPONE-1770
  - tributacion
  - pesos
---

# UPONE-1770-pre-intake

> **MOVIDO A sp11 (2026-09-14).** El ticket UPONE-1770 se trabaja ahora en sp11. Esta copia queda en sp10 como registro historico; **todo analisis siguiente va sobre los docs de sp11** (`sp11/UPONE-1770-detalle`, `-aduana`, `-pre-intake`, `-explicativo.html`). No editar esta version.

> Guia de implementacion (el COMO) para UPONE-1770. Material human-read, no va a Jira. El que-conseguir esta en `UPONE-1770-detalle`; la frontera en `UPONE-1770-aduana`.

## Mapa de piezas y donde vive cada una

| Pieza | Repo/archivo de enganche | Patron a copiar |
|---|---|---|
| Upsert de conjunto (batch) | `logic/competencyAlignment.resolver.js` (+ nuevo resolver/mutation) | `logic/competencyTree-upsert.resolver.js` (reemplazo total, `runInTransaction`) |
| Gobernar el peso | `logic/helpers/validateCompetencyAlignment.js` (`WRITABLE_FIELDS`) + resolver | ninguno (agregar campo + validacion) |
| Reparto en partes iguales | cliente (`weights.ts`) | G-6 (ya es client-side) |
| Via masiva | resolver del mod | `logic/matrixAdoption.resolver.js:246-300` (troceo backend, AD-12) |
| Guard suma al publicar | `curriculum-design/logic/curriculum-update.resolver.js:119-127` | `logic/helpers/assertPublishable.js` |
| Malla | `curriculum-design/modsComponents/CurriculumMesh/` (punto de extension nuevo) | ninguno (no hay reuso previo) |

## Decisiones tecnicas y enfoques

### 1. Upsert de conjunto: reemplazo total vs delta

- **A. Reemplazo total (recomendado).** El cliente manda el mapa completo por `(planId, matrixId)`; el resolver reconcilia (crea, actualiza, retira lo que no vino) en una transaccion. Pros: consistente con `upsertCompetencyTreeValidated` y con la barra "Guardar" de la maqueta; una sola entrada de historial; el estado del grupo se recalcula sobre el conjunto. Contras: hay que definir el **scope de borrado** con cuidado (que se considera "ya no vino": por matriz, por plan, por celda) para no retirar tributaciones fuera de la vista cargada. Mitigacion: acotar el reemplazo al `(planId, matrixId)` que el cliente declara, nunca a todo el plan.
- **B. Batch de operaciones (add/update/remove explicitos).** El cliente manda una lista de operaciones. Pros: sin riesgo de borrado implicito. Contras: se aleja de la semantica "sesion de trabajo / guardar todo" que pide el PO y duplica logica que la grilla ya hace por fila.
- **Hipotesis a validar:** que `competencyAlignmentView` devuelve exactamente el conjunto que el cliente reenvia (mismas filas), para que "lo que no vino = retirar" sea seguro.

### 2. Peso del eje 1

- Agregar `contributionPercentage` a `WRITABLE_FIELDS` y a la validacion del resolver. El campo es **string** a proposito (no truncar decimales): validar formato numerico 0-100.
- **Reparto en partes iguales: client-side** (G-6 ya lo fija asi). El servidor no reparte; solo valida al publicar.
- **R-6:** solo `Evaluates` y `Both` entran al grupo de peso. `Develops` no pondera. El grupo se arma por `(planId, competencyNodeId, developmentLevelId)` (el indice que dejo 1769).
- **Estado auto/manual derivado:** no persistir. Grupo automatico = pesos iguales dentro de tolerancia. Definir la tolerancia (p. ej. redondeo a los decimales de `cm.displayDecimals`).

### 3. Validacion de suma al publicar (cross-mod, D1)

- Va en curriculum-design, no en curriculum-mapping. Espejar `assertPublishable.js`: correr **antes** del generic, en la transicion `Approved->Active` de `Curriculum`, porque el motor de transiciones del core no acepta hooks de contenido.
- La validacion necesita leer las tributaciones del plan (objeto de curriculum-mapping) desde curriculum-design. **Hipotesis/riesgo:** como lee curriculum-design un agregado de curriculum-mapping sin acoplarse (query gobernada expuesta por el mapping, o un evento). Definir el contrato de esa lectura con el dueno del otro mod. Grupos con `courseAggregationMode = Max` se saltean.

### 4. Malla (cross-mod, D2)

- La premisa "reutilizando el componente existente" es imprecisa: `CurriculumMesh` no tiene punto de extension. **Enfoque:** agregar en curriculum-design un slot/evento en la tarjeta de asignatura para que curriculum-mapping inyecte la accion "Tributar", sin import directo cross-mod (M-26 prohibe el import mod->mod: rompe en runtime tras el sync).
- Alternativa mas barata: la accion "Tributar" de la tarjeta abre la misma pantalla/celda de tributacion ya existente, filtrada por el `planEntry`, en vez de replicar el editor dentro de la malla.

### 5. Gate por institucion (R-9)

- El peso solo se muestra/gobierna si la institucion lo tiene habilitado. Reusar el patron de parametro de tenant `cm.displayDecimals` (Config System). Definir el nombre del parametro y su default con el PO.

### 6. Paridad MCP del peso

- Al gobernar `contributionPercentage`, la via generic/MCP (`up1_create_object`/`createInstance`) sigue pudiendo setearlo sin reglas (deuda del discovery de 1756). Minimo: extender `tests/unit/competencyAlignmentParity.test.js` para cubrir el peso. Cierre real (bloquear la via generic) es el ticket core "gobernado-only", aparte.

## Recomendacion de particion

Partir los dos tramos cross-mod (D1 guard de publicacion, D2 malla) a **ticket(s) derivado(s) coordinados con curriculum-design**, y dejar en 1770 (curriculum-mapping) el nucleo: upsert de conjunto, gobierno del peso + reparto, via masiva, estado derivado y gate por institucion. Reduce el riesgo de tocar el publish de otro mod dentro de este ticket y baja el tier del tramo propio. Confirmar con PO/lead y con el dueno de curriculum-design.

## Orden sugerido (riesgos primero)

1. Upsert de conjunto (define el contrato de guardado y el mayor riesgo tecnico).
2. Gobernar el peso + R-6 + estado derivado (sobre el conjunto ya guardado).
3. Via masiva (reusa el patron bulk).
4. R-9 gate por institucion.
5. Cross-mod (D1/D2) si quedan en este ticket, o handoff al derivado.
