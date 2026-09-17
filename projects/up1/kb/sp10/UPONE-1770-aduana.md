---
id: DOC-kb-sp10-UPONE-1770-aduana
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp10
  - curriculum-mapping
  - aduana
  - UPONE-1770
  - frontera-core-mod
  - cross-mod
---

# UPONE-1770-aduana

> **MOVIDO A sp11 (2026-09-14).** El ticket UPONE-1770 se trabaja ahora en sp11. Esta copia queda en sp10 como registro historico; **todo analisis siguiente va sobre los docs de sp11** (`sp11/UPONE-1770-detalle`, `-aduana`, `-pre-intake`, `-explicativo.html`). No editar esta version.

> Evidencia extendida de la frontera core/mod de UPONE-1770 (modo analisis, sin crear tickets). El condensado vive en la seccion "Frontera core/mod (Aduana)" del `UPONE-1770-detalle`.

## Veredicto global

**`mal-encuadrado (parcial)`, sin artefactos core-worthy.** Ningun artefacto requiere tocar `object-manager` (core) ni un mecanismo de plataforma nuevo. Pero dos de los seis exceden el alcance de un ticket de curriculum-mapping: dependen de trabajo nuevo en **curriculum-design** (otro mod). Si UPONE-1770 se cierra solo en curriculum-mapping, esos dos quedan sin dueno.

## Tabla por artefacto

| # | Artefacto | Veredicto | Cross-mod | Motivo + fuente |
|---|---|---|---|---|
| 1 | Mutation batch (upsert transaccional de conjunto) para `CompetencyAlignment` | mod-only | No | Reemplazo total con `runInTransaction` es patron ya establecido en el propio mod: `logic/competencyTree-upsert.resolver.js:1-11` ("SEMANTICA: REEMPLAZO TOTAL, igual que los dos catalogos del mod"). `matrixAdoption.resolver.js` tambien resuelve lotes en el mod. `curriculum-design/logic/planEntry-batch.resolver.js` es inspiracion de patron (create directo + eventos post-commit + auditoria best-effort), no dependencia en runtime. El generic no cubre "reemplazo total transaccional", pero tampoco hace falta tocar el core: es escritura gobernada del propio objeto. |
| 2 | `contributionPercentage` en `WRITABLE_FIELDS` + reparto auto/manual + "partes iguales" | mod-only | No | `WRITABLE_FIELDS` es constante del mod (`logic/helpers/validateCompetencyAlignment.js:38-45`), no un mecanismo del core. El reparto en partes iguales ya esta decidido client-side: G-6 (`CLAUDE.md:200`) fija que el reparto (`weights.ts`, gemelo en `rubric.ts`) es un atajo de edicion y lo que se persiste lo validan RT4/RT5. Mismo criterio para `contributionPercentage`. |
| 3 | Guard "suma 100 al publicar el Plan" (excepcion `courseAggregationMode=Max`) | mod-only para el objeto que gobierna | **Si, hacia curriculum-design** | El precedente `assertPublishable.js:1-25` es logica de dominio del mod que corre antes del generic, en la transicion `Approved->Active` de SU objeto. La transicion analoga del Plan (`Curriculum`, `curriculum-design/objects/Curriculum.json:130`) pertenece a **curriculum-design**. Enganche natural: `curriculum-design/logic/curriculum-update.resolver.js:119-127`. No core-worthy, pero no lo construye este mod solo. |
| 4 | Via masiva de tributacion | mod-only | No | Patron bulk ya resuelto en el mod: `matrixAdoption.resolver.js:246-300` (`addMatrixAdoptions`), con troceo por `BATCH_SIZE` en backend (AD-12, `CLAUDE.md:180`: "El troceo de un lote grande vive en el BACKEND"). Reutilizar la receta, no plataforma nueva. |
| 5 | Asignacion desde la malla, reutilizando `curriculum-design/modsComponents/CurriculumMesh/` | no core-worthy per se, pero sin precedente de reuso | **Si, hacia curriculum-design** | No hay ningun import de `curriculum-design/modsComponents` desde curriculum-mapping (grep vacio) ni patron documentado de reuso de componente entre mods. M-26 (`CLAUDE.md:155`): el sync APLANA `modsComponents/<C>/` dentro de `layout/src/modsComponents/<C>/`, y un import roto entre arboles no da senal antes de runtime. G-2 (`CLAUDE.md:196`) descarta "encadenar con curriculum-design" como dependencia cross-mod prohibida (aplica del lado UI). No hay slot/evento en `CurriculumMesh` para inyectar la accion: es trabajo nuevo en curriculum-design. |
| 6 | Estado automatico/manual del grupo, derivado (no persistido) | mod-only | No | Logica de lectura/vista, estado derivado no persistido (patron `rowActions.ts`, AD-17, `CLAUDE.md:185`; decision de reglas solo-cliente G-6). No toca objetos, resolvers de escritura ni core. |

## Dependencias externas cross-mod

| Dependencia | Naturaleza | Detalle |
|---|---|---|
| Guard de publicacion del Plan (#3) | Capacidad nueva en curriculum-design | No existe hoy nada analogo en ese resolver; escribir el guard ahi, criterio de `assertPublishable.js` (exencion `Max`, antes del generic, transicion `Approved->Active`). |
| Punto de extension en `CurriculumMesh` (#5) | Capacidad nueva en curriculum-design (no reuso) | El componente existe pero no esta pensado para que otro mod inyecte una accion; no hay consumo cross-mod hoy ni slot/evento documentado. |

## Core Extension

**Ninguna requiere Core Extension.** Ambas dependencias cross-mod (#3 y #5) son trabajo de otro **mod** (curriculum-design), no del core. No pasan el test de genericidad hacia el core: son reglas/UI del dominio de planes de estudio, igual de mod-especificas que sus precedentes. Corresponde coordinar con el equipo/dueno de curriculum-design o dividir el ticket, no abrir una Core Extension.
