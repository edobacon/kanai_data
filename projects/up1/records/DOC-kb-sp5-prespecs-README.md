---
id: DOC-kb-sp5-prespecs-README
project: up1
type: doc
---

# SP5 — Pre-specs por ticket

Borradores de **spec + intake** por ticket consolidado, listos para transcribir al spec formal de DKC cuando se cree el ticket. Cada uno espeja la forma de un spec DKC: **REQ** con certeza (`confirmed`/`inferred`/`assumed`) + `source_ref`, **tasks** con rollback, **test cases** concretos, e **intake** (KB que aplica + necesidad/reuso DET-32 + supuestos).

> ⚠️ **No son records DKC.** Viven en `sp5/` como referencia/planificación. No tienen shape gateado ni se indexan en `index.db`. Su función: que el design DKC sea transcripción 1:1 (y que el dev tenga el detalle fino sin volver a las fuentes).

| Pre-spec | Ticket | Agrupa | SP | Tier |
|---|---|---|---:|---|
| [MC-01.md](MC-01.md) | Ajustes de modelo base | BE-0, BE-1 | 2 | Must |
| [MC-02.md](MC-02.md) | planEntry + requirementCategory | A1, A2 | 5 | Must |
| [MC-03.md](MC-03.md) | requirement (Composite) + bloque electivo | A3, A4 | 7 | Must/Should |
| [MC-04.md](MC-04.md) | Registro mod + contratos MCP | A5, F1 | 5 | Must |
| [MC-05.md](MC-05.md) | Malla: ver + edición + resumen | B1, B2, B3 | 5 | Must |
| [MC-06.md](MC-06.md) | Malla: agregar/editar asignaturas | B4, B5, B7 | 8 | Must/Should |
| [MC-07.md](MC-07.md) | Líneas de formación | C1–C4 | 5 | Must/Could |
| [MC-08.md](MC-08.md) | Malla: filtros + interacciones | B9, B6, B8 | 7 | Should/Could |
| [MC-09.md](MC-09.md) | Validación restrictiva | D2 | 3 | Could |

**Historia PM** de cada ticket: `../SP5-historias-usuario.md`. **Detalle técnico atómico:** `../SP5-plan-malla-curricular.md §3`. **Glosario:** `../README.md`.
