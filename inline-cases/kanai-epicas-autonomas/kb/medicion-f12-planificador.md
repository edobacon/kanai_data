# Medición de F12: planificador antes y después con cuerpos reales

Fecha: 2026-10-06. Código: kanai-app `setup` en `fc4ab80` (`server/epics/planner.ts`, función `evaluate`).

## Método

- Fixtures (fuera del repo): cuerpos originales de JOR-169 a JOR-175 tomados de la épica `EPIC-FACTURAS-CLIENTE-FEEDBACK` en versión 2, antes de editar los cuerpos; cuerpos actuales de TAO-181 a TAO-188 de `taomangalam-ep-01` y `taomangalam-ep-01a`.
- Catálogo y familias calculados igual que `mentionCatalog` (`server/epics/service.ts`), con lectura de solo lectura (`mode=ro`) del store.
- "Antes": `evaluate` sin catálogo (criterio anterior, denylist DEC/V/QA/EP). "Después": con catálogo y familias.

## Resultado

| Cohorte | Aristas del cuerpo antes | Después | Internas antes/después | Avisos "Dependencia externa pendiente" antes/después |
|---|---|---|---|---|
| Jormat (7 tickets) | 81 (todas externas falsas) | 0 | 0 / 0 | 81 / 0 |
| Tao (8 tickets) | 44 | 26 | 8 / 8 | 36 / 18 |

Familias detectadas: Jormat `JOR:2`; Tao `GH:2`, `HU:3`, `TAO:2` (más dos de ids internos de ruta, sin efecto).

## Qué se dejó de proponer en Tao (todo contexto)

- Historias HU-01 cerradas, resueltas por el id entre corchetes del título: HU-01-01 (TAO-170), HU-01-03 (TAO-174), HU-01-05 (TAO-176), HU-01-07 (TAO-172), HU-01-08 (TAO-177), HU-01-09 (TAO-179), HU-01-10 (TAO-178), HU-01-15 (TAO-180).
- TAO-179, cerrado.
- Metadatos sin familia en el proyecto: P-225 y REQ-07 (ya señalados en `resultado-prueba-f2.md` de kanai-pre-epica).

Se conservan las 15 historias HU abiertas o no importadas (HU-02-07, HU-03a-07..15, HU-03b-11, HU-08-05, HU-10-12, HU-15-03, HU-15-04), entre ellas HU-03a-08, el prerequisito real de TAO-186.

## Conclusión

F12-C1 se cumple: 0 aristas falsas en Jormat; Tao queda en 18 avisos (meta 44 o menos) sin perder referencias reales.
