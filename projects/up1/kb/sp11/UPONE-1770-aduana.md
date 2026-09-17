---
id: DOC-kb-sp11-UPONE-1770-aduana
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp11
  - curriculum-mapping
  - aduana
  - UPONE-1770
  - frontera-core-mod
  - cross-mod
---

# UPONE-1770-aduana

> ⚠️ **SUPERADO EN PARTE (2026-09-15) - leer con `UPONE-1770 - cierre de alcance y correcciones` (sp11).** Correccion sobre esta frontera: la fila #5 ("Asignacion desde la malla") **NO es cross-mod**. La maqueta muestra que "Por malla" es un modo de vista de la propia tributacion (cm ya lee `planEntry` por periodo via `alignmentView.resolver.js`), no reuso del `CurriculumMesh` de curriculum-design. Con eso, **el unico cross-mod real es la fila #3 (guard de suma al publicar el plan), que sale de 1770 a ticket aparte**. El resto es mod-only.

> **Copia en sp11** del analisis de frontera de UPONE-1770. El original queda tambien en sp10.

> Evidencia extendida de la frontera core/mod de UPONE-1770 (modo analisis, sin crear tickets). El condensado vive en la seccion "Frontera core/mod (Aduana)" del `UPONE-1770-detalle`.

## Veredicto global (revisado)

**mod-only**, sin artefactos core-worthy. Ningun artefacto requiere tocar `object-manager` (core). El unico que excede curriculum-mapping es el guard de "suma 100 al publicar el plan" (#3), que depende de la transicion de publicacion del `Curriculum` (curriculum-design) y sale de 1770 a su propio ticket. La "asignacion desde la malla" (#5), que este documento daba como cross-mod, es en realidad **cm-interno** (ver aviso).

## Tabla por artefacto

| # | Artefacto | Veredicto | Cross-mod | Motivo + fuente |
|---|---|---|---|---|
| 1 | Mutation batch (upsert transaccional de conjunto) para `CompetencyAlignment` | mod-only | No | Reemplazo total con `runInTransaction` es patron ya establecido en el propio mod: `logic/competencyTree-upsert.resolver.js:1-11`. `matrixAdoption.resolver.js` tambien resuelve lotes en el mod. El generic no cubre "reemplazo total transaccional", pero no hace falta tocar el core: es escritura gobernada del propio objeto. |
| 2 | `contributionPercentage` en `WRITABLE_FIELDS` + reparto auto/manual + "partes iguales" | mod-only | No | `WRITABLE_FIELDS` es constante del mod (`logic/helpers/validateCompetencyAlignment.js:38-45`). El reparto en partes iguales ya esta decidido client-side (G-6, `weights.ts`). Mismo criterio para `contributionPercentage`. |
| 3 | Guard "suma 100 al publicar el Plan" (excepcion `courseAggregationMode=Max`) | mod-only para el objeto que gobierna, pero en OTRO mod | **Si (unico) - sale a ticket aparte** | El precedente `assertPublishable.js` corre antes del generic en la transicion `Approved->Active` de SU objeto. La transicion analoga del Plan (`Curriculum`, `curriculum-design/objects/Curriculum.json:130`) pertenece a **curriculum-design** (`curriculum-update.resolver.js`). No core-worthy, pero no lo construye curriculum-mapping solo. **Requerimiento verificado del PO.** |
| 4 | Via masiva de tributacion | mod-only | No | Patron bulk ya resuelto en el mod: `matrixAdoption.resolver.js:246-300`, troceo por `BATCH_SIZE` en backend (AD-12). |
| 5 | ~~Asignacion desde la malla, reutilizando `CurriculumMesh` de cd~~ **Vista "Por malla" dentro de tributacion** | **mod-only [CORREGIDO]** | **No** | La maqueta muestra "Por malla" como un modo de vista de la propia tributacion, no reuso del `CurriculumMesh` de curriculum-design. cm ya lee `planEntry` con `period`/`position` (`alignmentView.resolver.js`), asi que dibuja la vista solo. No hay dependencia cross-mod ni punto de extension en cd. |
| 6 | Estado automatico/manual del grupo, derivado (no persistido) | mod-only | No | Logica de lectura/vista, estado derivado no persistido (patron `rowActions.ts`, AD-17). No toca objetos, resolvers de escritura ni core. |

## Dependencias externas cross-mod (revisado)

| Dependencia | Naturaleza | Detalle |
|---|---|---|
| Guard de publicacion del Plan (#3) | Capacidad nueva en curriculum-design | Escribir el guard en `curriculum-update.resolver.js`, criterio de `assertPublishable.js` (exencion `Max`, antes del generic, transicion `Approved->Active`). Sale de 1770 a ticket aparte; decision tecnica de como implementarlo sin acoplamiento ciclico (interceptor de core vs lectura acoplada). |

(La dependencia de "punto de extension en `CurriculumMesh`" queda **anulada**: la vista por malla es cm-interna.)

## Core Extension

**Ninguna requiere Core Extension** por si sola. El guard de publicacion (#3) es trabajo de otro **mod** (curriculum-design), no del core; la via limpia para el enforcement sin ciclo es el interceptor de core que G-2 ya propone, a decidir en su ticket.
